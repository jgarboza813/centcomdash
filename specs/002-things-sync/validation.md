# Things Sync implementation validation

Validated 2026-10-31. Implementation and verification evidence for the Things sync increment.

## Automated evidence

- Node 24: typecheck, ESLint and production build passed.
- Unit/integration: 52 tests passed across six files, including existing planning/scoring tests.
- Browser: 17 tests passed, including 11 existing dashboard regressions and six sync scenarios.
- Default tests use injected readers and a private mock HTTP service; they never read personal Things.
- Desktop (1440px) and mobile (375px) captures were inspected under artifacts/things-sync/.
  The action remains visible, keyboard operable, and the mobile page has no horizontal overflow.

Tests are consolidated: import/completion cases in tests/unit/things-import.test.ts;
API/history/rollback/concurrency/recovery cases in tests/integration/things-sync-api.test.ts;
HTTP mapping/errors in tests/integration/things-reader.test.ts; migration cases in
 tests/integration/things-migration.test.ts; browser cases in tests/e2e/things-sync.spec.ts.
The shared fixture HTTP service is tests/fixtures/things/mock-server.ts. Injectable readers
are defined inline in API tests rather than an extra reader.ts file.

Evidence includes exact marker/decorated weight matching, manual/equal-title separation,
ten repeated imports preserving local identities and weights, source completion authority,
missing/canceled/trashed preservation, renamed completed tasks outside Today, finalized protection,
ordinary edit link retention, atomic state-write failure, overlapping operation rejection,
midnight/finalization during reads, persistent receipt recovery after restart and after eligibility
changes, malformed/oversized/timeout/auth/rate-limit/timezone failure handling and tracked 404.
Browser tests check no reads during initial load/reload/date navigation, no automatic retry after
failure/focus, explicit keyboard sync, lost-response recovery with no second source read, failed
autosave blocking source access, and navigation while an operation runs. Existing tests cover
finalized calendar scoring/color rules. Source changes are inert until another button activation.

## Read-only live compatibility

- Pinned things-api 0.3.2, things-py 1.0.1, Python 3.12.16. Exact Python dependency lock is
  tools/things-api/requirements.lock. Compatibility is tied to the locally installed Things schema;
  the Things application version was not recorded independently.
- Repository launcher listens on 127.0.0.1:5225, with /health reporting read=true/write=false.
  Effective write token is explicitly absent; dotenv/config inheritance is disabled. Private bearer
  token is stored in ignored data/things-api-token, never in browser code or committed files.
- Live /today returned 86 records. Tags are strings; actual weights use 🔴 XL/🟠 L/🟢 M/🔵 S;
  the marker uses the emoji presentation variant ❗️. User approved these aliases.
- Verified live by-ID identity and missing 404. Empty tags and false trash are omitted by pinned
  library SQL and are the only such omissions normalized by the adapter.
- Pinned library completed/canceled/trashed results, Today localtime behavior around midnight and
  spring/fall DST were verified using a synthetic owned database in verify_reader.py. No personal
  source items were created, completed, canceled, trashed or rescheduled for validation. No recent
  completed live sample was available; synthetic checks are not represented as live transitions.
- /logbook?limit=1 returns an upstream unsupported-argument failure. Adapter does not use Logbook;
  linked completion is read through /todos/{id}.
- Launcher sets TZ=America/New_York and adds X-Centcom-Timezone. This header is our extension,
  not an upstream API field. The adapter fails before applying data if it is absent/mismatched.
- things-py predicts Today and cannot generate recurring occurrences; open Things before syncing.

## Live source → temporary dashboard acceptance

Explicit check-sync.ts used the real read-only service and an owned temporary Central Command DB:
25 imported, 7 unresolved; ten successful repeated operations, zero duplicate entries, persistent
receipt recovery passed. No actual dashboard tasks or Things tasks were changed. The check completed
within the two-minute import target. Unresolved invalid/multiple weights were reported rather than guessed.

A stopped-database backup was made before upgrading the actual dashboard:
data/central-command.before-things-sync-20261031-165329.sqlite (ignored, private).
The schema migration preserves existing finalized aggregates and legacy receipts; tests also verify
rollback on upgrade failure and refusal of unknown newer schema versions.

## Requirement review and remaining acceptance

FR-001–013 have implemented paths and automated/read-only evidence above: explicit activation;
today/editability/revision checks; exact selection and weights; stable identity/source authority;
protected history; atomic failures; feedback; server-only local configuration and limited source data.
SC-001/002 have temporary-database import/repeat evidence; SC-003/005 have fixture completion/history
and regression evidence; SC-004 has structured failure/result tests; SC-006 has trigger tests plus
review of the single hook call site. No source read is scheduled by effects, autosave or timers.

The remaining opt-in personal-data walkthrough is T033: use deliberately designated Things test
items to validate live complete/reopen/cancel/reschedule transitions and record the Things application
version. This was deliberately not substituted with changes to personal tasks. Automated coverage
and read-only compatibility passed; this outstanding acceptance item is not a missing implementation.

## Operational follow-up

Follow quickstart.md and tools/things-api/README.md. Keep service and dashboard separate; Ctrl+C
stops each. Back up the stopped dashboard SQLite file before upgrades. Repeat compatibility after
Things/service/library upgrades. Secrets, environments, personal databases and captures remain ignored.

## Today and This Evening regression (2026-10-31)

Pinned things.today() was exercised against synthetic same-day tasks with startBucket 0 and 1;
both appear in /today selection. No personal source data was changed. Reader regression asserts
both are retained as candidates in one list read. The existing XL/S browser fixture now explicitly
represents Today/This Evening respectively, exercising both imports through the button.
Unit/API suite: 53 passed. Typecheck, lint and diff whitespace checks passed. The six sync browser
scenarios passed against the updated two-section fixture. No second source endpoint is necessary.

### Test-isolation correction

The first evening browser rerun exposed a pre-existing fixed-port proxy defect: with the actual
app already listening on 3001, the test frontend reached it instead of its temporary backend.
That run was stopped. The actual dashboard was restored exactly from its last pre-run receipt
(revision 36, timestamp 2026-10-31T21:46:47.150Z), including links and last-success metadata;
test-generated receipts were removed. A private ignored pre-repair SQLite backup was retained.
Things was read but never written. Vite now accepts CENTCOM_BACKEND_URL; Playwright starts its
backend on dedicated port 5237 and targets that port explicitly. App startup logs the actual port.

After the isolation correction, all 17 browser tests passed with the real dashboard running
separately. Post-run verification confirmed its revision and last receipt both remained 36.
Production build also passed. Evening scope regression is complete.

## Completed-before-first-sync correction

The upstream Today reader defaults to incomplete tasks, explaining the reported six versus eight.
The launcher now installs DashboardThingsReader, combining incomplete Today/This Evening with
Today candidates completed on the current New York date, deduplicated by source identity.
Synthetic pinned-library checks verify inclusion of completed-today and exclusion of completed-yesterday.
The domain test verifies new completed candidates import with completed=true and assigned points.
All 54 unit/API tests, typecheck and lint passed. Restarted read-only service and explicitly ran
check-sync.ts against an owned temporary dashboard: 8 imported, 0 unresolved, 10 repeated syncs,
0 duplicates, receipt recovery passed, actual dashboard unmodified. No Things tasks were written.
