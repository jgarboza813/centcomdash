# Research: Things Project Categories

Research date: 2026-11-01. Evidence is repository code and installed pinned dependencies;
no live personal source reads or task changes were performed during planning.

## 1. Resolve project context at the existing source boundary

**Decision**: Extend tools/things-api/reader_policy.py to enrich each emitted to-do with
`project_category: {sourceId, name} | null`. Apply consistently to Today/This Evening/completed-today
candidates and tracked by-ID to-dos. Resolve relationships through a narrow, version-pinned read-only projection of task UUID,
project/heading references and parent UUID/type/title inside the Python service. Use the pinned
things.database.Database read-only connection; never open the Things database in Node. This
projection distinguishes no project from dangling references hidden by the library's joins.
Validate direct/heading project identity/name pairs; never substitute areas or heading names.

**Evidence**: Installed things/database.py SELECT exposes project/project_title from TASK.project,
and heading/heading_title from TASK.heading. PROJECT_OF_HEADING is joined but not selected as the
task's project. OMIT_IF_NONE removes project fields; thus missing direct project fields alone do not
prove no project for heading children. Existing reader_policy.py already extends Today to include
completed-today tasks; the extension must preserve that correction. Node wireTask currently strips
project fields entirely. Source review was independently checked by a research agent as required
by the planning skill.

**Rationale**: Python can resolve the known source-specific omission once and provide an unambiguous
contract to Node. A heading lookup failure is not an uncategorized task.

Additional source finding: things.get(headingId) forces descendant expansion. Avoid it for parent
resolution; read only relationship columns through the existing mode=ro database connection and
close the connection deterministically. Synthetic owned-data research confirmed direct and heading
field shapes and the dangling-reference ambiguity. Bound lookups to source task/parent IDs already
needed for this operation; no broad library read, recursive expansion or cross-click cache.

**Alternatives considered**: Direct optional project_title only (mislabels heading children and
cannot preserve identity); broad projects crawl (unnecessary data access); browser resolution
(exposes integration responsibilities and creates extra reads).

## 2. Advertise explicit category support

**Decision**: Repository launcher adds `X-Centcom-Categories: 1`; Node requires this alongside the
existing timezone header. Normalized source tasks require category object/null, never undefined.
Older readers fail with the existing THINGS_INCOMPATIBLE error before any apply.

**Rationale**: Otherwise an old service omitting fields could clear categories on every sync.
The header is our deployment extension, not an upstream Things API guarantee.

**Alternatives considered**: Treat all omitted category fields as null (unsafe); query every project
from Node (more source access and still ambiguous without a reliable membership contract).

## 3. Persist a snapshot inside each daily task

**Decision**: Add optional `category?: {sourceId: string; name: string} | null` to Task. New imports
and successful reconciliations write explicit object/null. Missing legacy fields stay valid and render
Uncategorized; reads do not rewrite records. Existing SQL user_version 2 and plan schemaVersion 1
remain valid because this is an additive optional JSON field, not a changed SQL shape. No promises
are made that an older application binary preserves new fields on writes; back up before rollback.

**Rationale**: Existing days.record already stores daily task snapshots. A live category registry would
allow source renames to rewrite historical labels or require an unnecessary second snapshot layer.
Finalization/reopening follows existing rules; categories refresh only on today's eligible explicit sync.

**Alternatives considered**: New categories table (no current management/aggregate requirement);
store only project ID and render latest project name (violates saved historical context).

## 4. Preserve server-owned category on ordinary saves and receipts

**Decision**: Keep existing strict taskInput; browser PUT payloads omit category and attempts to forge
it are rejected. daily-plan-store rebuilds retained task categories from the current saved task by local
ID. Client drafts and task edits retain category; acknowledgments must not replace newer revisions
with older receipt snapshots. Do not mutate stored receipts to inject current category data.

**Evidence**: Current mutate(save) rebuilds tasks from input and would drop any new category field;
useDailyPlan.flush maps only editable fields, as intended, but needs the existing acknowledgment
ordering reviewed. Sync receipt recovery already guards revision ordering. PlanTable.patch spreads
existing task fields, so title/weight/completion edits can preserve metadata in draft.

**Rationale**: Sync owns source metadata; ordinary plan edits should neither erase nor forge it.

## 5. Render below-title context without changing navigation or charts

**Decision**: Replace inline .things-link with a block secondary category label using its existing blue
color/font treatment. Display for imported, manual and legacy tasks, including edit mode. Use normal
text rendering and overflow-wrap for long/unbroken names. Keep the completion-authority explanation
as linked-task accessible descriptive text associated with the completion control, not by making the
category into a link or replacing the checkbox name.

**Rationale**: Matches the requested Things-like hierarchy while retaining the requested blue styling.
No live category queries on rendering, and no new navigation destinations or chart calculations.

## Planning resolution

All design unknowns have decisions. Source semantics are based on the pinned SQL, not invented live
payloads. The implementation's first compatibility gate must test direct/heading/no-project cases in
synthetic data and failure on unsupported deployment capability. Live behavior remains to be verified
explicitly with read-only diagnostics during implementation; no planning success claims live acceptance.

## Analysis remediation A1 — unresolved-task precedence

Canceled or trashed source tasks are classified as unresolved before project resolution. Emit no
project category for those outcomes; the dashboard preserves their saved category and does not
attempt to clear it. Missing tasks retain the existing explicit missing outcome. Required category
object/null validation and project-resolution failures apply to readable active/completed tasks
only. An absent category on an active/completed task remains incompatible and fails the operation.
A dangling project on a canceled/trashed task must not fail other valid updates in the same sync.
