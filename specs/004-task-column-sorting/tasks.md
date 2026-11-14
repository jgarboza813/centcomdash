# Tasks: Today's Plan Column Sorting

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/plan-table-sorting.md and quickstart.md.
**Tests**: Behavioral tests precede implementation; constitution verification applies. Checkboxes track completion, not approval.

## Phase 1: Setup and foundation

- [X] T001 Review artifacts, checklist and existing original-array edit flow; record consistency/isolation evidence in `specs/004-task-column-sorting/validation.md`. Keep browser backend 5237 and owned storage in `playwright.config.ts`.
- [X] T002 Add failing pure sorting tests in `tests/unit/task-sorting.test.ts`: six orders, English natural/case/accent ties, primary-direction-only reversal, null reset, nonmutation, empty/single and editing ID reconciliation.
- [X] T003 Implement transient selection types, first-direction transitions, stable copied sort and ID-order resolution in `src/client/task-sorting.ts`; no storage, source reads or task changes.

## Phase 2: US1 — Organize by column

- [X] T004 [US1] Add failing ordering/reset browser acceptance in `tests/e2e/task-sorting.spec.ts` using twelve mixed tasks; compare exact original records/revisions and zero mutation/source requests, including finalized views.
- [X] T005 [US1] Own selection in `src/client/App.tsx`; add sortable headers, current direction and Reset sort in `src/client/components/PlanTable.tsx`, deriving display rows only. Keep all task change/map/filter/append paths based on original tasks.
- [X] T006 [US1] Add coherent table/rowgroup/row/columnheader/cell roles and compact header-button/indicator styles in `src/client/components/PlanTable.tsx` and `src/client/styles.css`; no extra column, table package or grid keyboard model.

## Phase 3: US2 — Safe daily work

- [X] T007 [US2] Add edit/check/add/remove, same-identity focus, date navigation/reload, sync/failure/receipt recovery browser scenarios in `tests/e2e/task-sorting.spec.ts`; verify saved original order and retained category/draft data.
- [X] T008 [US2] Freeze displayed IDs during editing in `src/client/components/PlanTable.tsx`; keep new rows appended and removals dropped, apply latest blur values on Done. Scope local capture by date/lifecycle key in `src/client/App.tsx`, preserving App sort and existing per-day hook drafts across table unmounts.
- [X] T009 [US2] Verify checkbox focus after Status row movement in `tests/e2e/task-sorting.spec.ts`; if necessary implement narrowly guarded event-origin restoration in `src/client/components/PlanTable.tsx`. Preserve existing save/sync/revision protections without backend changes.

## Phase 4: US3 — Accessible responsive sorting

- [X] T010 [US3] Verify native header Enter/Space, reset focus, aria-sort, announcements and edit-pause explanation in `tests/e2e/task-sorting.spec.ts`; finalize accessibility/target styles in `src/client/styles.css`.
- [X] T011 [US3] Inspect 375/800/1440px captures under `artifacts/task-sorting/` and add browser checks in `tests/e2e/task-sorting.spec.ts` for long labels/categories, no overflow, empty/single views and 100-task visible sort within one second.

## Phase 5: Regression and documentation

- [X] T012 Run package typecheck/lint/unit/API/browser/build checks and record actual results, coverage and any limitations in `specs/004-task-column-sorting/validation.md`. No live source reads or actual dashboard mutations are needed.
- [X] T013 Update `README.md`, `specs/004-task-column-sorting/quickstart.md`, plan/contracts and task markers to reflect verified behavior and per-date edit-session resets; inspect consistency with FR-001–013 and SC-001–005.

## Dependencies and coverage

Setup → pure tests/helper → US1 tests/display → US2 tests/edit safety → US3 acceptance → full validation.
US1 is the smallest visible increment; history, edit safety and accessibility remain required before completion.
Independent pure tests and initial browser fixture design can proceed separately, but shared component edits are sequential.

FR-001–006: T002–T006. FR-007–010: T004–T009. FR-011–013: T006, T010–T011.
SC-001/002: T002/T004. SC-003: T011. SC-004: T010/T011. SC-005: T007–T009.

Pure entities: selection is null or task/weight/status with ascending/descending direction. Source tasks are immutable inputs;
base-sensitivity English numeric title comparison, explicit label rank, stable original-index ties and transient edit IDs apply.
No new endpoints, dependencies, schema fields or persisted preferences. Execution progress is recorded above; validation.md records actual results.
