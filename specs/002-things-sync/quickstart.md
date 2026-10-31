# Quickstart Validation: Sync with Things

This is the implementation validation guide. Recorded results and live/fixture distinctions
are in [validation.md](validation.md). See [API](contracts/sync-api.md),
[adapter](contracts/things-adapter.md), [UI](contracts/sync-ui.md) and [model](data-model.md).

## Prerequisites

Use Node 24 for Central Command and Python 3.12+ for the external things-api service.
The service runs on the same Mac as Things. Tested pins are things-api 0.3.2 and things-py
1.0.1 with Python 3.12.16. Follow [the service setup](../../tools/things-api/README.md):

```sh
uv venv tools/things-api/.venv --python 3.12
uv pip sync tools/things-api/requirements.lock --python tools/things-api/.venv/bin/python
tools/things-api/.venv/bin/python tools/things-api/serve.py
```

Run from the repository root. The launcher binds 127.0.0.1:5225, disables source writes,
sets America/New_York, ignores inherited service config and creates a private token in
ignored data/things-api-token. Central Command reads the same file by default. Stop the
service with Ctrl+C. Start Central Command separately with Node 24.

Server-only CENTCOM_THINGS_API_URL and CENTCOM_THINGS_API_TOKEN explicitly override defaults;
no dotenv loader is assumed. Never put tokens in CLI arguments, VITE variables or Git.
Use our launcher: it adds X-Centcom-Timezone, a local extension required by the adapter.
No upstream timezone header is assumed. Open Things before syncing so recurring occurrences
are materialized; the third-party reader cannot generate them.

Default automated tests use fixtures/mock HTTP, never the user's service/library. Back up the
stopped Central Command database before schema upgrades; use copied version-1 fixtures for
migration checks. No Things database or OS Automation permission changes are required by the
HTTP adapter itself. Service file-access failures must be reported, not bypassed.

Normal project commands remain:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run dev
```

Open http://127.0.0.1:5173. Stop existing local servers before E2E tests. Back up the stopped
application SQLite file before schema upgrade; test version-1 migration on a copied fixture,
never the actual user database. Existing scoring/reference tests must remain green.

## Fixture-based automated scenarios

1. Ten new Today tasks tagged ❗ plus valid XL/L/M/S import in under two minutes without
   manual title/weight entry. Untagged/title-marker-only/non-Today candidates do not import.
2. Missing/multiple weight tags are skipped/reported. Equal titles with distinct IDs remain
   separate; repeat the same selection ten times with no duplicate or weight change.
3. Local complete/source open becomes incomplete; source complete/local open becomes complete.
   Completed source in Logbook still resolves by link ID. Removed ❗ tag never unlinks history.
4. Missing/canceled/trash retain committed data and report unresolved. Rescheduled readable
   open status remains authoritative but is flagged as outside Today. Manual entries unchanged.
5. Spy on adapter and sync POST: zero calls for opening/reloading/refocus/date changes/local
   edits/lifecycle actions/advancing timers. One allowed button activation starts one operation;
   repeated clicks and competing tabs cannot run overlapping reads for that day.
6. Unauthorized/service-unavailable/database-unreadable/timeout/malformed/partial outputs cause no persisted mutation or timestamp
   advance. A forced link/receipt-write failure rolls back plan, links and metadata together.
7. Finalize/change revision or cross midnight during a delayed read: no source results apply.
   Begin on finalized/non-today/stale state: reject before source access.
8. Lost committed response then explicit retry: same request returns receipt without a second
   source read, duplicate task or extra update. Retry after restart verifies persistent receipt.
9. An ordinary manual PUT cannot forge/drop retained links. Rename/reweight preserves them;
   remove drops the local link; later explicit eligible import is again unique within the day.
10. Navigate during sync: preserve both dates' drafts and apply response only to target cache.
    Verify keyboard activation, busy/disabled state, result announcement and visible mobile button
    at 375px as well as header layout at 1440px.

## Opt-in local-service compatibility and acceptance

After installing/configuring the pinned service, perform explicit authenticated GET /health:
read must be true and write false. Confirm the listener is 127.0.0.1, not its default wildcard.
Verify /today payload fields for IDs, titles, exact ❗ and XL/L/M/S tags. Verify by-ID lookup
returns completed tasks outside Today and distinguishes canceled/trashed/missing. Record
sanitized schemas and tested service/things.py/Things versions. If required fields or completeness
cannot be established, stop and revise the adapter rather than pretending the probe passed.

Use deliberately designated test items. Then explicitly click Sync with Things and validate
imports, preserved weights, completion authority, no duplicates and timestamp/count feedback.
Stop the service or use a deliberately invalid token to validate unavailable/authentication
errors without changing saved plans. No automatic retries or startup health probes are allowed.
Recheck compatibility on service/library/Things upgrades because the reader depends on the
Things database structure. Read-only live compatibility and temporary-database import results are recorded in validation.md; live completion transitions were not performed on personal Things items.

## Analysis follow-up checks

- Run the external service with TZ=America/New_York and verify actual Today-query interpretation
  around New York midnight and DST against controlled fixtures. Record semantics/version/config;
  if alignment cannot be established, fail compatibility instead of guessing membership.
- Lose a committed response, advance past midnight or finalize from another tab, then explicitly
  activate Sync with Things: recovery endpoint returns the receipt with zero source reads/writes.
- Missing receipt yields not committed; active operation yields still running, with no implicit
  new sync or polling. Subsequent fresh sync requires another eligible button activation.
- A replay older than current acknowledged revision must not replace newer state or drafts.

## Today and This Evening scope

“Today” source membership includes both Things Today and its This Evening section. The pinned
things-api /today endpoint returns both; no separate evening endpoint or bucket exclusion is used.
Both sections use the same ❗ marker, weight rules, identity and completion reconciliation. The
synthetic pinned-library check in tools/things-api/verify_reader.py verifies both source buckets;
reader and browser fixtures cover evening import through the normal explicit button action.
