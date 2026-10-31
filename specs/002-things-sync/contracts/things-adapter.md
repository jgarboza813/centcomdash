# Things HTTP Read Adapter Contract

## Boundary

ThingsReader.readSnapshot(linkedSourceIds) returns a normalized SourceSnapshot defined in
[data-model.md](../data-model.md). Call only during a Sync with Things button operation.
Construction, startup, ordinary GETs and health/status rendering never contact the service.

## Configuration and requests

Server-only CENTCOM_THINGS_API_URL defaults to http://127.0.0.1:5225; require a literal loopback
host, expected HTTP scheme, configured port and no userinfo/query/path. Do not accept a URL,
source token or source IDs from the browser. CENTCOM_THINGS_API_TOKEN supplies the Authorization
Bearer header; never emit it in errors, logs, receipts, fixtures, Vite variables or the browser.
Reject redirects rather than forwarding credentials. Central Command uses GET requests only.

Read /today, filter exact direct ❗ tag membership and normalize its weight tags. Resolve tracked
IDs from this day's persisted links via /todos/{encodedId}, including completed tasks outside
Today. IDs are opaque and encoded as one path segment. No broad library or logbook crawl.
The service is configured separately with THINGS_API_HOST=127.0.0.1 and no effective
THINGS_AUTH_TOKEN, so it runs in read-only mode. Central Command never starts or reconfigures it.

## Compatibility gate

Pin service/library versions, then explicitly verify /health read=true/write=false, Today
membership, UUID/ID field, exact tag-name representation, completed/canceled/trash state and
missing-ID responses. Save sanitized shapes as test fixtures, never actual personal payloads.
The documented endpoint names are not proof that all needed fields behave as required.
If completed lookup/trash detection or full response completeness cannot be verified, report
incompatibility before coding assumptions. Do not infer completion from disappearance.
A diagnostic /health read belongs only to explicit setup or a button-triggered operation.

## Output and failure rules

- Normalize source incomplete to domain open, completed/canceled to corresponding states;
  preserve explicit trash flag. Match ❗/XL/L/M/S by exact tag names, not substrings or title.
- Known by-ID 404 yields missing. 401/403 yields authentication failure; connection failure,
  database-read failure, 429 or other errors fail the snapshot, with no automatic retry.
- Missing tracked outcome, unexpected/truncated payload or conflicting IDs fails the snapshot.
- Apply aggregate 30-second timeout and 4 MiB response budget across the entire operation;
  cancel pending fetches on error. Never truncate a successful candidate list silently.
- Normalize to unavailable, authentication-failed, timed-out, incompatible or read-failed.
  Discard unused notes/project/checklist fields immediately, without persistence/logging.
- Sequential HTTP reads are an observed snapshot, not a cross-app atomic transaction. Later
  Things edits are picked up only on the next explicit click; recheck local revision at commit.

## Testing seam

Inject fixture ThingsReader or mock local HTTP server in automated tests; default test runs
never query the real service/library. Assert exact GET path/header use, no redirects/token leaks,
no POST/PUT/DELETE source calls, and no health probes on page/server startup.
Live compatibility validation is separate and must record actual results and version pins.

## Today timezone compatibility

The service process must use TZ=America/New_York. Verify its actual pinned Today-query semantics
with controlled boundary fixtures around New York midnight and DST before implementing mapping;
no undocumented source timezone response field is assumed. Record deployment TZ and observed
semantics. If the service/library ignores TZ or correct membership cannot be demonstrated, fail
the compatibility gate and revise the reader. Fresh operations require verified configuration;
unknown/mismatched alignment yields THINGS_DATE_MISMATCH without applying candidates. Do not
silently substitute the Mac's local day or a guessed start-date filter for Things Today.

## Verified tag/payload clarification

Jose approved existing decorated weight tags: 🔴 XL=20, 🟠 L=10, 🟢 M=5, 🔵 S=1. Plain
XL/L/M/S aliases remain recognized; multiple recognized weight tags are unresolved. Normalize
only Unicode emoji presentation selectors in the ❗ marker; never use substring/title matching.
Pinned things-api 0.3.2/things-py 1.0.1 returns tag-name strings. Verified pinned-library SQL
omits tags when empty and trashed when false; normalize those specific omissions to []/false,
not arbitrary missing status or ID. Completed/canceled/trashed semantics were tested against
synthetic owned data; live Today and by-ID/404 were checked without changing Things items.

## Implemented launcher and snapshot details

The repository launcher adds X-Centcom-Timezone: America/New_York to responses after fixing
the process TZ. This is our deployment extension, not an upstream API field. The adapter
requires it during explicit operations. A private data/things-api-token file is the default
server token source; explicit server environment variables override it.

Today ordering drives new imports. For linked entries, the later by-ID read is authoritative
if it differs from the earlier Today response; this is expected under sequential source reads.
Duplicate IDs within either list and missing/mismatched tracked outcomes fail the operation.
Internal snapshots carry only candidates/tracked; completedAt is recorded at successful commit.

## Today and This Evening scope

“Today” source membership includes both Things Today and its This Evening section. The pinned
things-api /today endpoint returns both; no separate evening endpoint or bucket exclusion is used.
Both sections use the same ❗ marker, weight rules, identity and completion reconciliation. The
synthetic pinned-library check in tools/things-api/verify_reader.py verifies both source buckets;
reader and browser fixtures cover evening import through the normal explicit button action.

## Completed before first sync

Include eligible marked/weighted tasks completed today even if they were never linked before.
The upstream /today handler defaults to incomplete tasks. The repository launcher installs
DashboardThingsReader, combining that selection with things.today(status="completed",
stop_date=<today in America/New_York>). Deduplicate by source ID and preserve Today ordering.
Tasks completed on prior dates are excluded from new imports. Linked completion lookup remains
independent of list membership. This is a local reader extension; no source writes or automatic
sync triggers are introduced. verify_reader.py covers completed-today and completed-yesterday.
