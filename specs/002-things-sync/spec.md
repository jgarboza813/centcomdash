# Feature Specification: Sync with Things

**Feature Branch**: `main` (feature discovery is independent of branch)
**Created**: 2026-10-31
**Status**: Implemented; opt-in live transition walkthrough remaining (see validation.md)
**Input**: Jose wants to work on the Sync with Things feature next, continuing Spec Kit.

## Clarifications

### Session 2026-10-31

- Source selection: tasks in Things Today, including its This Evening section, with the exact tag named ❗.
- ❗ is a Things tag, not text in the task title.
- Initial weights: use Things XL, L, M and S tags, mapping to 20, 10, 5 and 1 points.
- Completion authority: Things overrides dashboard completion for linked tasks on sync.

## Scope

Enable the existing Sync with Things action to import selected Things 3 tasks into today's
editable Central Command plan and refresh completion for previously imported tasks. This first
integration reads Things without creating, editing, completing or deleting anything in Things.
Preserve the approved 20/10/5/1 weights, fixed-budget score, shared colors and explicit day
finalization. Historical commitments must never change silently.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Today's Commitments (Priority: P1)

As Jose, I want to bring my Things tasks into my daily plan without retyping them.

**Why this priority**: Imports remove duplicate task entry from the daily workflow.
**Independent Test**: Use a controlled source task set and import it into an editable day,
checking selected membership, identity and assigned weights without needing a completion refresh.

**Acceptance Scenarios**:

1. **Given** Things is available and today is editable, **When** I request sync, **Then**
   matching tasks appear once, with their titles and source identities, and the resulting
   allocation derives from Things XL/L/M/S tags as 20/10/5/1 points.
2. **Given** an imported task, **When** I sync the same source task again, **Then** its
   identity is preserved and it does not create another task or reset its assigned weight.
3. **Given** two Things tasks with equal titles but different identities, **When** imported,
   **Then** they remain separate entries; existing manual entries are never matched by title.
4. **Given** a successful source read containing no matching new tasks, **When** sync ends,
   **Then** I see that nothing was added; existing commitments are not removed.
5. **Given** Today tasks tagged ❗ with valid XL/L/M/S tags and untagged or non-Today tasks,
   **When** I sync, **Then** only the ❗-tagged Today tasks are newly imported with their tag weights.
6. **Given** a Today task whose title contains ❗ but which lacks the ❗ tag, **When** I sync,
   **Then** that task is not newly imported.
7. **Given** a new selected task with no weight tag or multiple weight tags, **When** I sync,
   **Then** it is skipped and reported unresolved rather than receiving an arbitrary weight.

### User Story 2 - Refresh Completion Safely (Priority: P2)

As Jose, I want Things completion changes reflected in the plan while preserving commitments.

**Why this priority**: Scoring should reflect execution without manually updating two tools.
**Independent Test**: Seed linked tasks with assigned weights, change source completion states,
and sync; verify resulting states and scores against the chosen authority policy.

**Acceptance Scenarios**:

1. **Given** a linked task completed in Things, **When** I sync its editable plan, **Then**
   it is marked complete regardless of its local checkbox state, and the daily score, task
   counts and shared colors update.
2. **Given** a linked task no longer in the Today list, **When** it is still identifiable
   in Things, **Then** sync can reconcile its status independently of Today membership.
3. **Given** a missing, trashed, canceled or rescheduled source task, **When** sync runs,
   **Then** its committed dashboard entry/weight is retained and unresolved source state is
   reported; absence or cancellation alone never counts as successful completion.
4. **Given** a finalized day, **When** sync is attempted, **Then** it does not change that
   day's entries, score or calendar shading; the user is told it is finalized.

5. **Given** a locally completed linked task that is open in Things, **When** I sync,
   **Then** it becomes incomplete and its points are removed from the completed score.
6. **Given** an already linked task whose Things weight tags change, **When** I sync,
   **Then** its previously assigned dashboard weight is preserved; only the agreed source-owned
   completion/title fields refresh.

### User Story 3 - Understand Sync Results and Failures (Priority: P3)

As Jose, I want clear feedback and safe retries when Things is unavailable or access fails.

**Why this priority**: Failed reads must not masquerade as empty source data or erase plans.
**Independent Test**: Reject source authentication, fail a source read or interrupt persistence; verify
unchanged saved records, an explicit failure message and successful duplicate-free retry.

**Acceptance Scenarios**:

1. **Given** the local Things service/database is unavailable or authentication is rejected, **When** sync is requested, **Then**
   I see the problem and retry guidance, not an empty-success result or a changed score.
2. **Given** a source read or save fails, **When** the operation ends, **Then** saved entries,
   weights and completion remain unchanged; retry does not create duplicates.
3. **Given** a concurrent dashboard edit or day finalization, **When** sync tries to apply,
   **Then** it reports the conflict rather than overwriting newer data.
4. **Given** a successful sync, **When** I inspect its result, **Then** I see the time and
   counts of added, updated and unresolved items, including an explicit no-changes result.

5. **Given** the dashboard is opened, reloaded, refocused, or navigated to another date,
   **When** the user has not activated “Sync with Things”, **Then** no source read or sync
   operation occurs, even if tasks changed in Things.
6. **Given** an idle editable day, **When** I activate “Sync with Things” by mouse or keyboard,
   **Then** one sync starts and repeated activation while running cannot start another.
7. **Given** a failed sync, **When** I wait or refocus the dashboard, **Then** no automatic
   retry occurs; activating “Sync with Things” again explicitly starts a retry.

8. **Given** a committed sync response was lost and its date is now past or finalized,
   **When** I activate the same button to recover, **Then** its saved result is shown with zero
   Things reads and no plan writes. An older result cannot overwrite a newer acknowledged day.
9. **Given** no committed receipt exists for an uncertain attempt, **When** I recover it,
   **Then** the UI reports not committed (or still running if active), without a fresh sync.
10. **Given** source Today interpretation does not match America/New_York, **When** I request
    a fresh sync, **Then** it fails clearly and no candidates are applied.

### Edge Cases

- Completed tasks may leave Today and appear in the Logbook; use source identity to reconcile.
- Changing titles cannot create a duplicate; never deduplicate against manually entered titles.
- A recurring occurrence may be a distinct source identity; do not collapse occurrences by name.
- Repeated clicks cannot start overlapping writes. Sync must not change the selected day if
  the user navigates while the request is running.
- Unsaved local edits must be saved first or sync must explain why it cannot proceed.
- Midnight while syncing must not import today's source into yesterday's selected plan.
- Canceled, missing, partially read and permission-denied results must not be treated as complete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sync MUST start only when the user explicitly activates the “Sync with Things”
  button (mouse, touch or keyboard). Opening/reloading the dashboard, navigating dates,
  changing tasks, finalizing/reopening days, regaining window focus, elapsed time or changes
  made in Things MUST NOT initiate sync. No startup, polling, scheduled or background sync,
  or automatic retry is allowed. After failure, the user MUST activate the same button again
  to retry. An uncertain prior operation MAY be recovered through the same explicit button after
  midnight/finalization; recovery MUST only retrieve its saved result and never read Things
  or start a fresh sync. Show idle/in-progress/success/failure states and prevent overlapping requests while
  the button's sync operation is running.
- **FR-002**: New imports MUST target today's editable day in America/New_York. Past/future
  days and finalized days MUST not accept new imports through this action. Source Today
  interpretation MUST align with America/New_York; unknown/mismatched source-date alignment
  MUST fail clearly without importing data. This restriction does not block read-free receipt recovery.
- **FR-003**: New imports MUST include tasks from both Things Today and This Evening carrying the exact tag named ❗.
  Tasks in either section without that tag and tagged tasks outside today’s combined Today/This Evening selection MUST be excluded. A ❗ character
  in the task title alone MUST NOT qualify a task for import.
- **FR-004**: Initial weights MUST derive from exactly one Things weight tag: XL = 20,
  L = 10, M = 5, S = 1. A new task with no matching weight tag or multiple weight tags MUST
  be skipped and reported unresolved, without assigning a default weight. Other unrelated tags
  do not affect weighting. Re-sync preserves already assigned daily commitment weights.
- **FR-005**: Things MUST override dashboard completion for linked tasks during successful
  sync: source completed sets complete; source open sets incomplete, even if the local checkbox
  disagrees. No confirmation preview is required. Local checkbox changes remain possible but
  may be overwritten at the next sync; linked entries MUST communicate that Things controls
  completion on sync. Missing/canceled/trashed source states follow FR-007, not false completion.
  No writes back to Things are included. Manual-only tasks remain locally controlled.
- **FR-006**: Source identity MUST distinguish linked tasks from manual tasks, remain stable
  across renames/retries and prevent duplicate imports within a day. Never link by title alone.
- **FR-007**: Sync MUST reconcile already linked tasks independently of whether they still
  appear in Today. Missing/canceled/trashed tasks MUST be retained and flagged unresolved rather
  than removed, marked complete or counted as a failed day silently.
- **FR-008**: Sync MUST preserve assigned commitment weights and every finalized day. A source
  rename MAY update an editable linked title; it MUST not alter task identity or old day records.
- **FR-009**: Source read and validation MUST finish successfully before applying changes.
  Apply accepted changes together or leave the saved plan unchanged on failure. Honor concurrent
  revision and lifecycle checks; retries MUST not duplicate tasks or undo newer edits.
- **FR-010**: Sync MUST distinguish rejected authentication, unavailable service/database, read failure, save failure,
  conflict and a genuine empty result. Never report failed reads as successful zero tasks.
- **FR-011**: Sync MUST show added/updated/unresolved counts and last successful sync time.
  Last successful time MUST not advance on failure. Sync feedback MUST be keyboard accessible
  and understandable without relying on colors alone.
- **FR-012**: All approved score calculations, color thresholds and calendar eligibility MUST
  remain unchanged. Successful sync of an editable day updates live scores but never finalizes it.
- **FR-013**: Import only source identity, task title, completion state and agreed selection/
  weighting metadata needed for this workflow. Notes, unrelated projects and full library
  replication are not included. Task data stays within the local application.

### Key Entities *(include if feature involves data)*

- **Source Task**: A Things identity, title, completion state and selection/weight metadata.
- **Task Link**: Association between one daily entry and its Things source identity.
- **Sync Result**: Target date, result state, added/updated/unresolved counts and successful time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jose can import and weight a controlled ten-task Today selection in under two
  minutes without retyping titles or manually assigning valid tagged weights.
- **SC-002**: Ten repeated syncs of an unchanged selection produce zero duplicate entries,
  preserve every assigned weight and leave the same score.
- **SC-003**: Completed linked tasks absent from Today still reconcile correctly in all
  controlled completion scenarios, without changing unrelated manual tasks.
- **SC-004**: Every permission/read/save/conflict/finalization failure scenario preserves
  the prior saved plan and produces an actionable message.
- **SC-005**: Before/after comparison across all finalized-day scenarios shows no changes to
  task identity, titles, weights, completion, score or calendar eligibility.

- **SC-006**: Trigger tests observe zero source reads/sync attempts on startup, reload,
  navigation, local edits, lifecycle changes, focus changes, timers or source changes; each
  permitted explicit button activation starts one operation with no overlapping duplicate.

## Assumptions

- Things 3 data, the approved third-party local Things API service and Central Command run
  on the same Mac. The service reads Things data locally; no cloud task endpoint is assumed.
- This feature continues the original read-only Things import/completion-sync MVP scope.
  Bidirectional sync, editing Things from the dashboard, scheduled sync and past-day backfill
  require separate explicit requirements.
- Missing or conflicting weight tags are reported and skipped; Jose can correct the Things
  tags and sync again. This is the draft failure-handling default, not a new manual weight UI.
- The checkmark alignment CSS fix already in the working tree is independent of this feature.

- Architecture clarification: Jose approved jaydenk/things-api in place of the proposed Mac
  scripting reader. It runs as a separate authenticated loopback service in read-only mode.
  Acceptance of its Things database-schema dependency does not change the button-only trigger
  or authorize write endpoints. Live compatibility remains an implementation prerequisite.

## Verified tag/payload clarification

Jose approved existing decorated weight tags: 🔴 XL=20, 🟠 L=10, 🟢 M=5, 🔵 S=1. Plain
XL/L/M/S aliases remain recognized; multiple recognized weight tags are unresolved. Normalize
only Unicode emoji presentation selectors in the ❗ marker; never use substring/title matching.
Pinned things-api 0.3.2/things-py 1.0.1 returns tag-name strings. Verified pinned-library SQL
omits tags when empty and trashed when false; normalize those specific omissions to []/false,
not arbitrary missing status or ID. Completed/canceled/trashed semantics were tested against
synthetic owned data; live Today and by-ID/404 were checked without changing Things items.

## Today / This Evening clarification (2026-10-31)

Every explicit sync includes both Today and This Evening tasks with the required marker and
one valid weight tag. This Evening is part of the pinned /today response, not an additional
endpoint. Existing identity, completion authority, assigned-weight preservation and button-only
rules apply equally to both sections. No task is excluded because it is scheduled for this evening.

## Completed before first sync

Include eligible marked/weighted tasks completed today even if they were never linked before.
The upstream /today handler defaults to incomplete tasks. The repository launcher installs
DashboardThingsReader, combining that selection with things.today(status="completed",
stop_date=<today in America/New_York>). Deduplicate by source ID and preserve Today ordering.
Tasks completed on prior dates are excluded from new imports. Linked completion lookup remains
independent of list membership. This is a local reader extension; no source writes or automatic
sync triggers are introduced. verify_reader.py covers completed-today and completed-yesterday.
