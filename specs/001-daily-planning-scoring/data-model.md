# Data Model: Daily Planning and Scoring

## DailyPlan (aggregate stored as one row per day)

| Field | Type | Rule |
| --- | --- | --- |
| date | YYYY-MM-DD string, primary key | Real calendar date; assigned date never changes |
| timezone | string | America/New_York in schema v1 |
| status | editable or finalized | Changed only by explicit lifecycle operations |
| tasks | ordered list of DailyTask | Stored as validated JSON; empty allowed |
| scoreRule | string | fixed-budget-v1; preserved on reopen |
| revision | nonnegative integer | Absent virtual day = 0; persisted revision starts at 1 |
| schemaVersion | integer | 1 initially; unknown versions fail safely |
| createdAt / updatedAt | UTC timestamp | Server assigned |
| finalizedAt | UTC timestamp or null | Set on finalize; cleared on reopen |

A missing date returns a virtual editable empty plan, revision 0, without writing a row.
The first save or finalization creates it. Database schema version uses SQLite user_version;
transactional numbered migrations preserve existing records and never drop/reset on an error.
Back up a stopped database before later migrations; test upgrades from the previous version.

## DailyTask (owned by one DailyPlan)

| Field | Type | Rule |
| --- | --- | --- |
| id | UUID string | Generated once on entry creation; stable through edits/retries |
| title | string | Trimmed and nonblank; duplicate titles permitted |
| weightLabel | XL, L, M, S | Exactly one |
| weightPoints | integer | 20, 10, 5, 1 respectively in this version |
| completed | boolean | Initially false; no fractional completion |

IDs are unique within a plan. Existing task IDs survive snapshot saves; removed IDs disappear
only from their owning editable day. JSON array order is presentation order. Server validates
all fields, rejects unknown fields, and never trusts submitted totals. Request limit: 1 MiB
with an explicit error and retained UI input if exceeded (no silent truncation).
Future weight settings must preserve old task weights and require their own versioned policy.

## DailyResult (derived, not independently writable)

- plannedPoints = sum of all task weightPoints.
- completedPoints = sum of weightPoints where completed is true.
- remainingPoints = max(0, 100 - plannedPoints).
- overCapacityPoints = max(0, plannedPoints - 100).
- totalCount = number of tasks; completedCount = number marked complete.
- scorePercent = completedPoints for nonempty plans; null for empty plans (“No plan”).

No caps or normalization. Invariants: completedPoints <= plannedPoints, counts match tasks,
and finalized reads use saved task values and the stored scoreRule. Version v1 calculations
remain available if later rules are introduced.

| Task set | Planned | Completed | Remaining / excess | Score |
| --- | --- | --- | --- | --- |
| Empty | 0 | 0 | 100 remaining | No plan |
| 3 XL, 2 L, 3 M, 1 S; none done | 96 | 0 | 4 remaining | 0% |
| Same; one XL and one M done | 96 | 25 | 4 remaining | 25% |
| Same; three XL and two L done | 96 | 80 | 4 remaining | 80% |
| Same; all done | 96 | 96 | 4 remaining | 96% |
| Six XL, all done | 120 | 120 | 20 excess | 120% |

## MutationReceipt (retry safety)

Persist requestId (unique UUID), canonical payload fingerprint including operation/date,
response snapshot, and createdAt. Successful replay of the identical request returns the same
snapshot without another write. Reusing an ID with different input returns conflict. Store
receipt and plan change in one transaction; failed changes create no receipt. No receipt
cleanup in this slice, so ordinary restarts cannot break exact retries.

## Lifecycle and transaction rules

- editable → editable: validated task snapshot replacement with matching expectedRevision.
- editable → finalized: explicit finalize; stores current validated aggregate atomically.
- finalized → editable: explicit reopen; preserves date/tasks/weights/score rule/results.
- finalized → finalized task mutation: rejected, including attempts to bypass UI controls.
- Midnight: no transition; today's default date is computed in America/New_York when opening
  today, while an already selected date remains stable.

Each mutation transaction checks a replay receipt first, reads the day, checks revision and
status, validates data, writes the incremented revision and receipt, and commits. Any error
rolls back both. Stale revisions never overwrite the stored day. Reopen clears finalizedAt;
this slice records current state rather than a full audit trail of historical corrections.

## Client state (not the authoritative record)

Track selectedDate; load state (loading/ready/error); last acknowledged aggregate; editable
draft; save state (saved/pending/failed); in-flight request; and unsent changes per date.
Retain drafts across in-app date changes. Ignore late load responses for another selected date.
Keep newest edits pending while older saves resolve; never overwrite a newer draft with an
older acknowledgement. Conflicts preserve the draft and show a reload action with explicit
confirmation before discarding unsaved input. Never auto-merge or auto-retry a conflict.

## Reference-layout presentation state

Client-only state also includes navigation menu open/closed, plan view/edit mode, add-task
form state, and day-actions menu state. These are not persisted lifecycle states. Done closes
edit mode without finalizing. The rings and summary reuse DailyResult; they add no normalized
completion field. Future streak/category/timeline/notes slots have no fabricated records and
introduce no schema fields in this slice. Their persistence belongs to follow-up specs.

## Monthly historical-score projection

Read existing DailyPlan/DailyResult rows by calendar month; do not persist a duplicate monthly
score. Expose date, lifecycle state and scorePercent (nullable for No plan) for each saved day.
Missing rows remain absent, not implicit zero. The client builds the Sunday-first month grid.
Classification uses contracts/score-colors.md; derive color without storing it. Zero and null
share neutral styling but retain distinct values. Provisional/open eligibility and future-date
behavior remain separate clarifications.
Selected calendar month and keyboard focus are client presentation state; date selection reuses
existing draft-safe navigation. Reopening/refinalizing a day must refresh its month projection.

## Shared score classification

Derive one score-band token from scorePercent using contracts/score-colors.md. The same token
feeds all daily-score components. Preserve null versus zero; do not change fixed-budget-v1
or persist UI colors. Scores >=95, including above 100, map to bright green.
