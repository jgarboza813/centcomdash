# Category Source and Persistence Contract

## Explicit read-only source access

Retain existing GET /health, /today and /todos/{encodedId} calls inside explicit Sync with Things only.
No new browser endpoint, project crawl, source write, polling or retry loop is introduced. Receipt-only
recovery reads stored dashboard receipts and never source categories. Keep the existing 30-second
aggregate request timeout/4 MiB response budget and loopback/server-secret protections.

The repository Python launcher adds `X-Centcom-Categories: 1` alongside its existing timezone header.
Node requires the value on successful source responses before using payloads; absence/unsupported
version fails with THINGS_INCOMPATIBLE and an instruction to restart/update the repository launcher.
This is a local extension, not an upstream service capability claim.

Every emitted active/completed, non-trashed to-do carries:

```json
{"project_category":{"sourceId":"opaque-project-id","name":"Bodybuilding"}}
```

or `"project_category": null` for confirmed no project. Node strips unrelated source fields and maps
this to required normalized category. Malformed/blank/partial objects, undefined fields or capability
mismatch fail the entire snapshot. Canceled/trashed outcomes omit project_category and preserve saved metadata without project resolution. Candidate and tracked paths must agree on contract, including new
completed-today candidates. Completed tasks from earlier dates remain excluded from initial imports.

## Relationship resolution within the Python reader

Use the pinned things.database.Database connection, opened mode=ro, for a parameterized minimal
relationship projection for each emitted task and needed parent references. Never add direct Things
SQLite access to Node or change the user's source database. Close connection resources deterministically;
keep parent memoization local to one response/operation, never persistent across explicit clicks.

Resolve these cases with synthetic pinned-schema fixtures before connecting to the live source:

| Relationship evidence | Category result |
| --- | --- |
| Valid direct project reference, project type and nonblank title | Project ID/title |
| Valid heading reference with valid containing project | Containing project ID/title |
| Both direct and heading project paths | Require agreement; conflicting identity fails |
| Confirmed no project and no heading relationship | null, even when an area exists |
| Dangling task, project or heading reference; invalid parent type/title | Fail read; never null |

Do not use a heading's name as the category. Avoid things.get(parentId) for enrichment because the
pinned public function expands descendants; the minimal projection must not fetch project/task bodies,
notes or checklists. Source changes between sequential HTTP reads are not cross-app atomic: use each
tracked by-ID result as the latest observed task context, validate it, then recheck local eligibility
before the existing atomic apply.

The source library omits unresolved project columns as well as absent ones. Raw omitted fields alone
are therefore insufficient proof of no-project membership; the explicit enrichment is mandatory.
Library/schema upgrades must rerun these checks; unsupported shapes fail instead of clearing metadata.

## Dashboard transport and persistence

Existing day GET and sync response envelopes return optional Task.category. No endpoint or ordinary
save input shape changes. Category-only reconciliation contributes to existing updatedCount once per
task. Same-name projects never deduplicate source tasks; source links remain keyed by source task ID.
Ordinary PUT retains the saved category for retained local task IDs, discards it only when that task
is removed, and rejects forged category input. Removing a local linked task then explicitly reimporting
it uses a new local identity and current source category, matching existing reimport behavior.

Existing transaction commits plan/category, links, sync state and receipt together. Any category read or
persistence failure leaves all prior state intact. Auth/timezone/revision/finalized/midnight safeguards
and missing/canceled/trashed handling remain unchanged. Persisted receipt snapshots are never enriched
from the current source; lower-revision replay must not roll the client back to older category data.

## Analysis remediation A1 — unresolved-task precedence

Canceled or trashed source tasks are classified as unresolved before project resolution. Emit no
project category for those outcomes; the dashboard preserves their saved category and does not
attempt to clear it. Missing tasks retain the existing explicit missing outcome. Required category
object/null validation and project-resolution failures apply to readable active/completed tasks
only. An absent category on an active/completed task remains incompatible and fails the operation.
A dangling project on a canceled/trashed task must not fail other valid updates in the same sync.
