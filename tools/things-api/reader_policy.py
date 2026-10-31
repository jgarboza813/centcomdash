"""Central Command's explicit Today selection, including today's completed items."""
from datetime import date
import things
from things_api.services.reader import ThingsReader


def today_with_completed(**kwargs):
    # Upstream today() defaults to incomplete. Bound completed selection to today
    # so old completed scheduled tasks cannot be reimported as today's commitments.
    items = things.today(**kwargs) + things.today(
        status="completed", stop_date=date.today().isoformat(), **kwargs
    )
    unique = {item['uuid']: item for item in items}
    return sorted(unique.values(), key=lambda item: (item['today_index'], item.get('start_date') or ''))


class DashboardThingsReader(ThingsReader):
    def today(self):
        return today_with_completed(**self._kwargs())
