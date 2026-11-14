"""Central Command's explicit Today selection, including today's completed items."""
from datetime import date
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
        return enrich_categories(today_with_completed(**self._kwargs()), filepath=self._db_path)

    def get(self, uuid):
        item = super().get(uuid)
        return enrich_categories([item], filepath=self._db_path)[0] if item else None
