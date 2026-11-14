# Implementation Plan: Today's Plan Column Sorting

**Branch**: `main` (actual Git branch; logical feature ID `004-task-column-sorting`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-task-column-sorting/spec.md`

## Summary

Add display-only single-column sorting for Task, Weight and Status. Own sort selection in App,
which survives the table's loading/error unmounts; derive a copied display array with stable ties.
Keep all edit/save operations based on the original task array. Freeze displayed task IDs during
Edit Plan, scoped to the viewed date, and resume sorting on Done. Use real header buttons within
coherent table semantics, with compact direction indicators and an explicit Reset sort action.

## Technical Context

**Language/Version**: Existing TypeScript 6, React 19 and Node 24 toolchain.

**Primary Dependencies**: Existing React and browser Intl.Collator; no package or service additions.

**Storage**: Session-in-memory UI state only. No local/session storage, new API fields, persisted preferences, schema changes or migrations.

**Testing**: Vitest pure ordering tests and Playwright observable ordering, editing, focus, network-invariance and responsive acceptance; existing API/scoring/history regressions.

**Target Platform**: Existing browser SPA at 375px, 800px and 1440px; local Mac backend/source service unchanged.

**Project Type**: Frontend enhancement within the current local web application.

**Performance Goals**: 100-task sort visibly updates within one second; zero sort-triggered saves/source reads.

**Constraints**: Saved order/identities/scores/categories unchanged by sorting. Six column/direction combinations; stable original-order ties. Finalized/history sorting enabled independently of editing eligibility. No category sort, filtering, manual reorder or cross-session preference.

**Scale/Scope**: One daily task table, three columns, one active sort. Existing source selection/authority, compact rows, fixed-width weight badges and responsive sidebar remain intact.

## Constitution Check

*Before research: PASS. After design: PASS; no unresolved gates or constitutional exceptions.*

| Principle | Design evidence |
| --- | --- |
| I. Specify before coding | Approved spec, researched plan/contracts, then tasks/analyze before code. |
| II. Preserve commitments | UI-only ordered copy; sort never changes weights/points or scoring. |
| III. Focused MVP | Helps find/review daily commitments; no new analytics or automation. |
| IV. Historical accuracy | No persistence path for sort choice/order; historical/finalized views read saved tasks. |
| V. Simple verification | Existing stack, one pure helper, targeted behavior/network tests; no dependency/schema changes. |
| VI. Effortless use | Keyboard header buttons, table sort semantics, stable edit rows, focus review and three viewport checks. |

## Project Structure

### Documentation (this feature)

```text
specs/004-task-column-sorting/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── plan-table-sorting.md
```

Tasks will be generated separately; this plan does not create tasks.md or implementation code.

### Source Code (repository root)

```text
src/client/App.tsx                         # page-lifetime sort selection
src/client/task-sorting.ts                 # new pure sort/ID-order helpers and UI types
src/client/components/PlanTable.tsx         # header/reset controls, displayed order, edit snapshot
src/client/styles.css                      # compact header indicators/focus and table-cell layout
src/domain/daily-plan.ts                   # existing Task type, consumed without changes
tests/unit/task-sorting.test.ts            # new ordering and immutability checks
tests/e2e/task-sorting.spec.ts              # new sorting/edit/focus/network/viewport acceptance
tests/e2e/{dashboard,things-sync,task-categories}.spec.ts  # existing regressions
```

**Structure Decision**: Keep this UI behavior in the client, outside the domain's persisted commitment
model. App supplies sort selection/setter and date to PlanTable. PlanTable retains editable tasks in
original order and computes display rows separately. No server, Things reader, save-input or receipt
format changes are planned.

## Design and Integration

1. Pure helpers compare titles with Intl.Collator('en', {numeric:true, sensitivity:'base'}), weight
   by explicit label rank and completion by boolean value. Decorate with underlying index, apply
   direction only to the primary comparison, then always use increasing underlying index for ties.
2. Sort state is null or column/direction. First activations: Task ascending, Weight descending,
   Status ascending (incomplete first). Same-column activation toggles direction; a new column uses
   its initial direction. Reset sets null. Sort never calls change/edit/flush/sync.
3. Readable table always offers sorting, including finalized days. Do not reuse disabled (which
   includes finalized/sync/edit blockers) as a blanket sort-disable flag. Only Edit Plan pauses sort;
   loading/error already hide the table. View-mode sorting while a source operation runs is allowed.
4. On Edit Plan capture current display IDs for that date. During edit derive rows from that fixed
   ID sequence against current underlying tasks: omit removed IDs, append newly seen IDs in original
   array order and retain them in the editing sequence. Preserve keys by task.id. Done discards the
   snapshot and recomputes sort. No sorted array is passed to change: patch/remove map/filter original
   tasks and additions append to original tasks. Existing autosave/draft behavior stays in useDailyPlan.
5. Key PlanTable by date and editable/finalized status. Navigation/finalization ends local editing
   and discards only its capture; App's sort choice and useDailyPlan's per-date drafts remain.
   The next Edit Plan activation captures that day's latest displayed order. Sync temporarily
   blocking controls does not change this key or discard an active capture. Reconcile newly
   encountered IDs and removals in the capture before paint without changing existing ranks.
6. Reordered rows stay keyed by ID. Verify the activated checkbox retains focus after Status sorting.
   If DOM movement loses it, restore only that event's checkbox with an ID-targeted ref after commit,
   only when the same day/control remains active and focus has not moved elsewhere. No broad focus
   effect or sorted-index identity. Preserve title/weight/remove accessible names and source descriptions.
7. Wrap header/data rows in coherent role=table/rowgroup/row/columnheader/cell semantics, retaining
   CSS grid geometry. Header buttons remain native buttons, not a grid widget. aria-sort belongs only
   on the active columnheader, not the button. Show the active direction inline only; use Weight/Status icons with hover titles and
   accessible names so the controls fit their current narrow columns. Reset sort sits beside Edit Plan in
   a wrapping action group. Explain paused sorting during editing visibly and through descriptions.
8. Existing accepted save/sync/recovery state is the only input to the display helper. Sort introduces
   no extra effect-driven reads or writes and must not replace useDailyPlan's revision/draft protections.

## Validation Sequence

Write meaningful pure ordering/immutability tests before helper implementation, followed by browser
acceptance for saved-order invariance and edits/sync/focus. Use twelve mixed tasks, stable duplicate
and accent/case ties, numbered names, all weights/statuses, empty/single and 100-task fixtures.
Verify six orders plus reset; inspect 375/800/1440px and old/new category wrapping. Compare exact
saved arrays/revisions/score/calendar state, and count zero PUT/transition/sync calls for sorting.
Use owned temporary test storage and mock source service with dedicated backend 5237. Default
checks must never operate against the actual dashboard on 3001 or personal Things on 5225.

## Complexity Tracking

No constitutional violations. Small coherent table roles are required because the current visual
columns have no header semantics; a grid widget or new table package would add unnecessary scope.
App-owned sort state is required by existing conditional unmounts, not by anticipated future scale.
