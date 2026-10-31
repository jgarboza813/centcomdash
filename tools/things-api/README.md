# Local read-only Things API

Pinned Things API 0.3.2 and things-py 1.0.1 are resolved in requirements.lock. Use Python 3.12:

```sh
uv venv tools/things-api/.venv --python 3.12
uv pip sync tools/things-api/requirements.lock --python tools/things-api/.venv/bin/python
 tools/things-api/.venv/bin/python tools/things-api/serve.py
```

Run the launcher from the repository root. It fixes TZ to America/New_York, binds only
127.0.0.1:5225, ignores inherited dotenv/config files, explicitly disables Things writes,
and generates/reads a private token in ignored data/things-api-token. It adds a timezone header
that our adapter requires; this is our launcher extension, not an upstream Things API feature.
Do not use the upstream setup wizard to import a Things write token. Stop with Ctrl+C.

Start Central Command separately with Node 24 (`npm run dev` or `npm run build && npm start`).
Its server reads that local token file; no browser token is needed. Explicit server environment
CENTCOM_THINGS_API_TOKEN and CENTCOM_THINGS_API_URL can override the defaults, but the URL must
remain HTTP on literal 127.0.0.1 with no credentials/path/query/redirect. No dotenv loader is
assumed. Never put the token in CLI arguments, VITE variables, screenshots, chat or Git.

Only the dashboard Sync with Things button initiates normal imports. Server/page startup and
ordinary date/plan reads never contact the source. The launcher does not start Things itself.
Open Things regularly to materialize recurring occurrences: upstream things-py documents Today
as a prediction and does not generate new repeating occurrences if the app has not done so.
This limitation cannot be fixed by pretending that missing tasks were completed.

Two explicit diagnostic commands (never run automatically):

```sh
tools/things-api/.venv/bin/python tools/things-api/verify_reader.py
node --import tsx tools/things-api/check-sync.ts
```

The Python check uses only a synthetic owned database. The TypeScript check reads the real
service and applies ten syncs only to a temporary Central Command database which it then
removes; it does not change the actual dashboard or Things. Its output is counts only.

The pinned package's /logbook?limit= option failed with an unsupported library argument during
compatibility validation. Our adapter uses /today and tracked /todos/{id} lookups, not Logbook.
The pinned library omits tags when absent and trashed when false; the reader normalizes these
specific verified omissions. Unexpected IDs/statuses/formats still fail without applying data.

Before upgrading Things, things-api or things-py, repeat compatibility and regression checks,
then regenerate/review the lockfile deliberately. The reader depends on Things' database schema;
this is a third-party local integration, not an official Cultured Code cloud API.

The pinned /today endpoint includes both Today and This Evening tasks. Both are eligible for
marker/weight filtering; the synthetic verification checks startBucket 0 and 1 membership.

## Completed before first sync

Include eligible marked/weighted tasks completed today even if they were never linked before.
The upstream /today handler defaults to incomplete tasks. The repository launcher installs
DashboardThingsReader, combining that selection with things.today(status="completed",
stop_date=<today in America/New_York>). Deduplicate by source ID and preserve Today ordering.
Tasks completed on prior dates are excluded from new imports. Linked completion lookup remains
independent of list membership. This is a local reader extension; no source writes or automatic
sync triggers are introduced. verify_reader.py covers completed-today and completed-yesterday.
