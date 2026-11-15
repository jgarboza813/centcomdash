"""Central Command's explicit Today selection, including today's completed items."""
from datetime import date, datetime
import things
import sqlite3
from things.database import Database
from things_api.services.reader import ThingsReader


def today_with_completed(**kwargs):
    # Upstream today() defaults to incomplete. Bound completed selection to today
    # so old completed scheduled tasks cannot be reimported as today's commitments.
    items = things.today(**kwargs) + things.today(
        status="completed", stop_date=date.today().isoformat(), **kwargs
    )
    unique = {item['uuid']: item for item in items}
    return sorted(unique.values(), key=lambda item: (item['today_index'], item.get('start_date') or ''))


def exclude_archived(items, *, filepath=None):
    """Match Logbook membership without confusing completion with archiving.

    TMSettings.logInterval: 0 immediately, 1 daily, 4 manually. Log Completed
    Now advances manualLogDate; a task completed before that cutoff is archived
    even if it was completed today. Apply the same rule to containing projects.
    """
    database = Database(filepath=filepath)
    connection = database.connection
    connection.row_factory = sqlite3.Row
    try:
        settings = connection.execute(
            'SELECT logInterval,manualLogDate FROM TMSettings LIMIT 1'
        ).fetchone()
        interval = settings['logInterval'] if settings else 1
        cutoff = (settings['manualLogDate'] or 0) if settings else 0
        current_day = date.today()
        cache = {}

        def record(identifier):
            if identifier not in cache:
                cache[identifier] = connection.execute(
                    'SELECT uuid,type,status,trashed,stopDate,project,heading FROM TMTask WHERE uuid=?',
                    (identifier,),
                ).fetchone()
            row = cache[identifier]
            if row is None:
                raise RuntimeError("Things archive relationship is unavailable.")
            return row

        def archived(row):
            if row['trashed']:
                return True
            if row['status'] not in (2, 3):
                return False
            stopped = row['stopDate'] or 0
            if interval == 0 or stopped <= cutoff:
                return True
            return interval != 4 and datetime.fromtimestamp(stopped).date() != current_day

        selected = []
        for item in items:
            if item.get('type') != 'to-do':
                selected.append(item)
                continue
            row = record(item['uuid'])
            if archived(row):
                continue
            parents = []
            if row['project']:
                parents.append(record(row['project']))
            if row['heading']:
                heading = record(row['heading'])
                if heading['trashed']:
                    continue
                if heading['project']:
                    parents.append(record(heading['project']))
            if any(archived(parent) for parent in parents):
                continue
            selected.append(item)
        return selected
    finally:
        connection.close()


def enrich_categories(items, *, filepath=None):
    """Resolve only emitted task relationships through a short-lived read-only connection."""
    database = Database(filepath=filepath)
    connection = database.connection
    connection.row_factory = sqlite3.Row
    cache = {}

    def record(identifier):
        if not isinstance(identifier, str) or not identifier.strip():
            raise RuntimeError("Things project relationship is invalid.")
        if identifier not in cache:
            cache[identifier] = connection.execute(
                'SELECT uuid,type,title,project,heading FROM TMTask WHERE uuid=?',
                (identifier,),
            ).fetchone()
        row = cache[identifier]
        if row is None:
            raise RuntimeError("Things project relationship is unavailable.")
        return row

    def project(identifier):
        row = record(identifier)
        if row['type'] != 1 or not isinstance(row['title'], str) or not row['title'].strip():
            raise RuntimeError("Things project information is invalid.")
        return {'sourceId': row['uuid'], 'name': row['title']}

    try:
        result = []
        for original in items:
            item = dict(original)
            if item.get('type') != 'to-do':
                result.append(item)
                continue
            if item.get('status') == 'canceled' or item.get('trashed', False):
                item.pop('project_category', None)
                result.append(item)
                continue
            row = record(item['uuid'])
            if row['type'] != 0:
                raise RuntimeError("Things task relationship is invalid.")
            direct = project(row['project']) if row['project'] else None
            containing = None
            if row['heading']:
                heading = record(row['heading'])
                if heading['type'] != 2 or not heading['project']:
                    raise RuntimeError("Things heading relationship is invalid.")
                containing = project(heading['project'])
            if direct and containing and direct['sourceId'] != containing['sourceId']:
                raise RuntimeError("Things project relationships disagree.")
            item['project_category'] = direct or containing
            result.append(item)
        return result
    finally:
        connection.close()


class DashboardThingsReader(ThingsReader):
    def today(self):
        items = today_with_completed(**self._kwargs())
        return enrich_categories(exclude_archived(items, filepath=self._db_path), filepath=self._db_path)

    def get(self, uuid):
        item = super().get(uuid)
        return enrich_categories([item], filepath=self._db_path)[0] if item else None
