# Research: Sync with Things

**Date**: 2026-10-31 | **Status**: Third-party approach approved; live compatibility unverified

## Selected source reader

**Decision**: Replace the original JXA/osascript design with a local jaydenk/things-api service
and a small Node HTTP ThingsReader adapter. Python 3.12+ is an external runtime prerequisite;
pin tested things-api and things.py versions during an opt-in compatibility check.
**Rationale**: Reuse existing Today/task-by-ID access rather than implementing Mac scripting.
Jose explicitly selected this approach after reviewing the tradeoff.
**Alternatives considered**: Mac scripting avoids database-schema dependency but requires our
own reader and permissions handling. URL scheme supports commands/navigation, not task export.
Directly duplicating things.py's SQL in Node would add maintenance without reusing the library.

The service reads Things' database via things.py; its write path uses the URL scheme. This is
third-party software, not a Cultured Code cloud API. We accept dependency on the Things database
structure and must verify compatibility on upgrades; no assumption of vendor schema stability.
Source: [repository](https://github.com/jaydenk/things-api),
[things.py](https://github.com/thingsapi/things.py).

## Read access and configuration

**Decision**: GET /today for candidates and GET /todos/{id} for tracked tasks no longer present.
Filter exact direct ❗/weight tags locally after validating returned tag representation. Validate
completed/canceled/trashed and missing-ID behavior in actual responses before implementation.
No broad /logbook query is relied on for correctness because history limits can omit old links.
**Rationale**: Targeted identity lookups support completion refresh without importing a library.
Source: [endpoint reference](https://github.com/jaydenk/things-api/blob/main/docs/api-reference.md).

**Decision**: Explicit loopback binding and read-only service mode, token retained server-side.
The service's documented default bind is 0.0.0.0; override with THINGS_API_HOST=127.0.0.1.
Use its bearer token, leave THINGS_AUTH_TOKEN absent, and verify effective read=true/write=false.
Its configuration can inherit values from a config file, so checking environment alone is not
sufficient. Never print/copy tokens into source, browser configuration or command arguments.
Source: [configuration](https://github.com/jaydenk/things-api/blob/main/docs/configuration.md).

## Existing merge design retained

Keep separate per-day links and last-success metadata, stable local/source identities, preserved
assigned weights, Things-authoritative completion and transactional revision/lifecycle checks.
Receipt-first replay avoids new source access after a committed response was lost. All source
requests belong to a single button operation; neither startup nor timers initiate reads/retries.
Missing/canceled/trash remain unresolved; readable source open/completed states control completion.

## Compatibility check and HTTP limits

**Decision**: Validate /health, /today, by-ID lookup, exact tags, statuses/trash, complete payloads,
Unicode and read-only mode against pinned versions. Use test records deliberately selected by
Jose; no live reads in planning. A 404 by-ID is missing; auth/network/database errors invalidate
the operation, never masquerade as missing or empty. Missing required trash/status fields block
the concrete adapter rather than prompting guesses.
**Decision**: GET-only fetch with redirects rejected, aggregate 30s deadline and aggregate 4 MiB
response budget. Cancel outstanding requests on fatal failure and do not retry automatically.
Drop source fields not needed for sync before returning data to domain code; discard raw bodies.
**Rationale**: Bounded, testable integration without a source-content cache or public endpoint.

## Readiness-review resolutions

Receipt lookup precedes eligibility checks; a dedicated explicit recovery-only request lets
the same UI button recover lost results after midnight/finalization without source access.
No receipt never triggers an implicit fresh read. New source operations still require today
and editable status. Source Today timezone semantics must be verified against America/New_York
using the pinned service with explicit TZ, including midnight/DST boundaries; the deployment
setting alone is not evidence. Contract tests are placed before service/endpoint implementation.

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
