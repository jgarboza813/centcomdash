"""Local read-only service; ignores external dotenv/config and never enables writes."""
import os
import secrets
import time
from pathlib import Path

os.environ['TZ'] = 'America/New_York'
time.tzset()
from things_api.config import Settings
from things_api.app import create_app
import uvicorn
from reader_policy import DashboardThingsReader

ROOT = Path(__file__).resolve().parents[2]
TOKEN = ROOT / 'data' / 'things-api-token'
TOKEN.parent.mkdir(parents=True, exist_ok=True)
if not TOKEN.exists():
    fd = os.open(TOKEN, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(secrets.token_urlsafe(32))
settings = Settings(_env_file=None, things_api_host='127.0.0.1', things_api_port=5225,
                    things_api_token=TOKEN.read_text().strip(), things_auth_token=None)
assert not settings.write_enabled
app = create_app(settings)
app.state.reader = DashboardThingsReader(str(settings.things_db_path) if settings.things_db_path else None)
@app.middleware("http")
async def timezone_header(request, call_next):
    response = await call_next(request)
    response.headers['X-Centcom-Timezone'] = 'America/New_York'
    return response
uvicorn.run(app, host='127.0.0.1', port=5225, access_log=False)
