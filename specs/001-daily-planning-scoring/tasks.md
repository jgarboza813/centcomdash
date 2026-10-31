# Tasks: Daily Planning and Scoring

**Input**: Design documents from `specs/001-daily-planning-scoring/`.

**Prerequisites**: [plan](plan.md), [spec](spec.md), [model](data-model.md), [research](research.md), [UI contract](contracts/daily-dashboard.md), [API contract](contracts/daily-plans-api.md), [reference](design-reference.md), [quickstart](quickstart.md), and constitution v1.0.0.

**Tests**: Required by constitution V and the plan’s validation strategy. Write behavioral tests before the related implementation and observe meaningful failures; avoid tests that merely repeat implementation details. No application work has started.

**Format**: `- [ ] Tnnn [P?] [USn?] Description with file paths`. Paths are repository-relative. `[P]` identifies work that can run alongside the other marked tasks in the same phase after earlier prerequisites, without editing the same files. It is not an instruction to spawn agents.

**Scope**: Local manual daily workflow plus the newly requested historical-score calendar.
Shared color thresholds are confirmed; calendar lifecycle eligibility/future-date behavior
remain to clarify. Existing score calculation stays unchanged. Match the supplied layout; disabled/labeled future features do not implement Things sync, categories, streaks, notes, scheduling or advanced analytics.

## Phase 1: Setup (Shared Infrastructure)

Establish the runtime, single npm project and reproducible validation commands.

- [ ] T001 Activate project-scoped Node 24 without replacing system Node; pin it in `.nvmrc` and record engines in `package.json`; verify the chosen better-sqlite3 release supports macOS arm64/Node 24.
- [ ] T002 Initialize React/TypeScript/Vite and Express/better-sqlite3/Zod/tsx in `package.json`, strict client/server TypeScript configs and `index.html`; pin compatible versions and commit resolution in `package-lock.json`.
- [ ] T003 Configure dev/build/start/typecheck/lint/test/test:e2e scripts in `package.json`, loopback-only Vite port 5173 with strict port and `/api` proxy in `vite.config.ts`, and built server output on port 3001.
- [ ] T004 [P] Configure lint rules in `eslint.config.js` and ignore runtime SQLite files/sidecars, node_modules, builds and test artifacts in `.gitignore`.
- [ ] T005 [P] Configure Vitest in `vitest.config.ts`, Playwright isolated servers in `playwright.config.ts`, and owned temporary database/server fixtures in `tests/fixtures/`; never open/reset the user database.

**Checkpoint**: Complete prerequisite tasks before dependent phases.

## Phase 2: Foundational (Blocking Prerequisites)

Complete these shared contracts and infrastructure before story implementation.

- [ ] T006 Define shared DailyPlan/DailyTask/DailyResult and request/response types in `src/domain/daily-plan.ts`: date “Real calendar date; assigned date never changes”; status “editable or finalized”; tasks “Stored as validated JSON; empty allowed”; scoreRule “fixed-budget-v1; preserved on reopen”; revision “Absent virtual day = 0; persisted revision starts at 1”; schemaVersion “1 initially; unknown versions fail safely”; timestamps “Server assigned”; finalizedAt “Set on finalize; cleared on reopen”.
- [ ] T007 Define boundary schemas in `src/domain/validation.ts`: id “Generated once on entry creation; stable through edits/retries” as UUID; title “Trimmed and nonblank; duplicate titles permitted”; weightLabel “Exactly one” of XL/L/M/S; weightPoints “20, 10, 5, 1 respectively in this version”; completed “Initially false; no fractional completion”; enforce unique task IDs per day, America/New_York timezone, reject unknown fields, and separate mutation inputs from server-owned fields.
- [ ] T008 [P] Implement date identity and New York today/greeting helpers in `src/domain/dates.ts`; preserve YYYY-MM-DD identity across midnight/DST and reject impossible calendar dates; add focused boundary tests in `tests/unit/dates.test.ts`.
- [ ] T009 [P] Implement database initialization in `src/server/db/database.ts` and initial aggregate/receipt schema migration in `src/server/db/migrations/001-initial.ts`; use configurable CENTCOM_DB_PATH, rollback journaling, synchronous FULL, user_version and transactional migrations that refuse unknown versions or failed upgrades without resetting records.
- [ ] T010 Create Express/bootstrap in `src/server/app.ts` and `src/server/index.ts`: bind 127.0.0.1, validate local Host/Origin, no broad CORS, JSON mutation content-type, 1 MiB request limit, no-store plan responses, structured contract errors and sanitized logs; serve built client in start mode.

**Checkpoint**: Complete prerequisite tasks before dependent phases.

## Phase 3: User Story 1 — Plan a Day’s Commitment (Priority: P1)

Enter and edit a daily task set and see correct capacity allocation. Independent test: add the nine-task 96-point fixture, verify 4 remaining, then add M to show 101 and 1 excess; test validation, rename, reweight and removal without completion/history features.

- [ ] T011 [P] [US1] Write behavioral allocation/validation tests in `tests/unit/planning.test.ts` for 0/96/100/101/120 points, blank titles, missing/invalid weights, distinct equal-title entries and task removal (FR-002–005).
- [ ] T012 [P] [US1] Write GET/PUT contract tests in `tests/integration/planning-api.test.ts` for virtual revision-0 GET without insertion, valid snapshot saves, server-assigned weights, invalid bodies and payload-size errors; use temporary databases (FR-001–005, FR-010–012).
- [ ] T013 [US1] Implement pure editable-task operations and allocation calculations in `src/domain/daily-plan.ts` and `src/domain/scoring.ts`; preserve stable IDs/order, initialize incomplete tasks and compute uncapped planned/remaining/excess points.
- [ ] T014 [US1] Implement transactional editable snapshot saves and MutationReceipt persistence in `src/server/db/daily-plan-store.ts`: compare revision and lifecycle, preserve numeric weights for unchanged labels, assign points on deliberate label changes, fingerprint operation/date/body, replay exact receipts before state checks, reject changed-ID reuse and roll back receipt plus record together; no receipt cleanup.
- [ ] T015 [US1] Implement read/save services and GET/PUT routes in `src/server/daily-plan-service.ts` and `src/server/app.ts`; return DayEnvelope with server-derived result, preserve date/schema/rule metadata, produce all applicable documented 400/403/409/413/500 errors.
- [ ] T016 [US1] Implement typed transport in `src/client/api/daily-plans.ts` and editable-day state in `src/client/hooks/useDailyPlan.ts`; track acknowledged plan/draft, 300ms committed-edit autosave, pending/saved/failed feedback, stable request IDs, serialized writes and explicit retry without overwriting newer edits.
- [ ] T017 [US1] Build daily page baseline in `src/client/App.tsx`, `src/client/components/PlanTable.tsx`, `src/client/components/AddTaskForm.tsx` and `src/client/components/SaveStatus.tsx`: labeled date, allocation/footer, default table view, Edit Plan/Done, add/cancel form, inline validation and accessible focus; Done never finalizes.
- [ ] T018 [US1] Run US1 independent acceptance flow in `tests/e2e/planning.spec.ts` including distinct duplicate-title edits and missing-weight input; record outcomes against FR-001–005 and SC-001 in `specs/001-daily-planning-scoring/validation.md`.

**Checkpoint**: All phase tasks and the independent acceptance check must pass before dependent work proceeds.

## Phase 4: User Story 2 — Track Weighted Completion (Priority: P2)

Track actual completed weight against the fixed budget. Independent test: seed a prepared plan and verify 25%, 20%, 80%, 96%, and above-100 results without requiring lifecycle or reference styling.

- [ ] T019 [P] [US2] Write pure score regression cases in `tests/unit/scoring.test.ts` for empty null/“No plan”, nonempty 0%, 25%, undo to 20%, 80 of 96 = 80%, all 96 = 96%, all 120 = 120%, and completed-entry reweight/removal (FR-006–009).
- [ ] T020 [P] [US2] Write completion persistence contract cases in `tests/integration/completion-api.test.ts` verifying completed flags, integer weights, derived counts/results and rejection of client-submitted totals (FR-006–010).
- [ ] T021 [US2] Implement fixed-budget-v1 completedPoints/counts/scorePercent calculations in `src/domain/scoring.ts` and completion operations in `src/domain/daily-plan.ts`; no partial completion, cap or normalization; completed points cannot exceed the same task set’s planned points.
- [ ] T022 [US2] Wire direct accessible completion checkboxes and live result text into `src/client/components/PlanTable.tsx`, `src/client/components/DailySummary.tsx` and `src/client/App.tsx`; keep completion usable in view mode and all totals consistent through reweight/removal.
- [ ] T023 [US2] Validate prepared-plan completion flows in `tests/e2e/completion.spec.ts`; assert score, completed points/count and allocation separately, including empty-after-removal and 100-task subsecond updates; record SC-002/003 evidence in `specs/001-daily-planning-scoring/validation.md`.

**Checkpoint**: All phase tasks and the independent acceptance check must pass before dependent work proceeds.

## Phase 5: User Story 3 — Save, Finalize, and Revisit a Day (Priority: P3)

Preserve saved records, safely finalize/reopen and revisit dates. Independent test: use saved fixtures, restart the server, inspect exact record identity/results, then finalize/reopen without creating another day.

- [ ] T024 [P] [US3] Write disk-backed integrity tests in `tests/integration/persistence.test.ts` covering connection/process reopen, per-day isolation, forced transaction rollback, lost-response replay across restart, changed-payload ID reuse, stale revisions and migration failure preserving records (FR-010–012).
- [ ] T025 [P] [US3] Write lifecycle contract tests in `tests/integration/lifecycle-api.test.ts` for explicit finalize/reopen, finalized PUT rejection, invalid transitions, empty/incomplete finalization, transition rollback, receipt replay and original date/rule/weights preserved (FR-013).
- [ ] T026 [US3] Implement guarded atomic lifecycle methods in `src/server/db/daily-plan-store.ts` and `src/server/daily-plan-service.ts`; persist revision and receipt together, finalize virtual empty days, set/clear finalizedAt, preserve all task values and never transition at midnight.
- [ ] T027 [US3] Expose POST finalize/reopen in `src/server/app.ts` and transport methods in `src/client/api/daily-plans.ts`; enforce expectedRevision, exact replay and specified INVALID_STATE/REVISION_CONFLICT errors.
- [ ] T028 [US3] Extend per-date drafts and request sequencing in `src/client/hooks/useDailyPlan.ts` for late acknowledgements, new edits during saves, switching dates, failed-load write blocking, exact retry, and conflict retention; require explicit confirmation before discarding drafts, with no auto-merge or conflict auto-retry.
- [ ] T029 [US3] Implement date selection/Today/History access in `src/client/components/DateNavigation.tsx` and `src/client/App.tsx`; restore saved dates, distinguish absent/loading/failed states and retain current date across midnight.
- [ ] T030 [US3] Implement keyboard-accessible lifecycle menu in `src/client/components/DayActions.tsx`; flush pending edits before finalize, expose editable/finalized text outside menu, disable conflicting actions in flight and all task edits when finalized; show failure without claiming transition success.
- [ ] T031 [US3] Implement load retry, conflict/discard UI and unsaved-page-exit protection in `src/client/components/SaveStatus.tsx` and `src/client/hooks/useDailyPlan.ts`; preserve unsaved session input and last acknowledged record.
- [ ] T032 [US3] Add end-to-end persistence/lifecycle scenarios in `tests/e2e/history.spec.ts` and `tests/e2e/save-failures.spec.ts`: reload/restart, two-tab conflict, delayed response/date navigation, lost acknowledgement retry and failed load/finalize/reopen; verify no duplicates, cross-day corruption or silent state changes.
- [ ] T033 [US3] Run US3 acceptance scenarios including midnight and empty finalization, recording exact saved-value comparisons and FR-010–013/SC-004/006/007 outcomes in `specs/001-daily-planning-scoring/validation.md`.

**Checkpoint**: All phase tasks and the independent acceptance check must pass before dependent work proceeds.

## Phase 6: User Story 4 — Recognize the Daily Command Dashboard (Priority: P3)

Match the reference composition with truthful future-feature placeholders. Independent test: render a seeded day at 1440px/375px and verify all regions, edit/add controls and fixed-budget substitutions against design-reference.md.

- [ ] T034 [P] [US4] Write reference-layout assertions in `tests/e2e/dashboard-layout.spec.ts` covering all named regions, visible lifecycle/save status, desktop/mobile navigation, disabled future actions, view/edit/add workflow, 80 / 100 score and no fabricated extra-feature metrics (FR-017–021).
- [ ] T035 [US4] Implement brand/sidebar/greeting/header structure in `src/client/components/DashboardShell.tsx` and `src/client/App.tsx`: ordered Today/Calendar/History/Analytics/Categories/Settings, functional daily History selector, Calendar focusing the embedded month panel, disabled other deferred destinations, disabled Things action with explanations and compact identity footer; preserve lifecycle menu access.
- [ ] T036 [US4] Build Planned/Completed/Tasks/Streak cards and shared inline-SVG ring in `src/client/components/DailySummary.tsx` and `src/client/components/ProgressRing.tsx`; reuse actual results, show fixed 100 denominator, shared score-based colors from T042, readable empty/overflow text and labeled future streak instead of fake counts.
- [ ] T037 [US4] Implement reference supporting panels in `src/client/components/SupportingPanels.tsx`: Today’s Progress with the actual daily-score ring and “Progress over time coming later”; Points by Category with “Category breakdown coming later”; capacity-based Weight Guide; Today’s Timeline with “Task scheduling coming later”; Notes for Today with “Daily notes coming later”; and Insights with “Insights coming later” plus disabled View all. Preserve each heading and placement from the UI contract; show no fabricated category donut, curve, scheduled times, active notes editor or urgency marks.
- [ ] T038 [US4] Apply reference CSS grid and dark tokens in `src/client/styles.css`: persistent desktop sidebar, four-card row, large plan table/right-side Progress/Category/horizontal Guide/Notes/Insights stack and lower-left Timeline/Calendar pair, subtle borders/dividers, badge colors and dashed Add task; wrap long titles and collapse mobile navigation/stack panels without page overflow.
- [ ] T039 [US4] Integrate reference panel layout and plan view/edit/add focus behavior in `src/client/App.tsx` and `src/client/components/PlanTable.tsx`; skeleton/error views retain composition and distinguish missing from failed data; past-day labels avoid “today” claims.
- [ ] T040 [US4] Verify keyboard/focus/menu/status semantics and disabled explanations in `tests/e2e/dashboard-accessibility.spec.ts`; check textual equivalents, contrast, long titles and no overlap/horizontal scroll at 375px and 1440px (FR-014–021, SC-005/008).
- [ ] T041 [US4] Capture rendered desktop/mobile evidence in `artifacts/dashboard/` and record comparison against the conversation image plus documented substitutions in `specs/001-daily-planning-scoring/validation.md`; keep generated images ignored and report actual differences rather than claiming pixel equivalence.

**Checkpoint**: All phase tasks and the independent acceptance check must pass before dependent work proceeds.

- [ ] T042 [US4] Implement shared score classifier in `src/domain/score-colors.ts` and semantic tokens in `src/client/styles.css` per `specs/001-daily-planning-scoring/contracts/score-colors.md`: >=95 bright green; >=85–<95 green; >=65–<85 yellow; >=45–<65 orange; >0–<45 red; zero/null/missing neutral No data, preserving distinct stored values. Test boundary/fractional/above-100 cases in `tests/unit/score-colors.test.ts` and wire the same mapping into `src/client/components/DailySummary.tsx`, `ProgressRing.tsx` and `SupportingPanels.tsx`; leave allocation blue unchanged.
- [ ] T043 [US4] After resolving calendar lifecycle eligibility and future-date presentation in the spec/contracts (colors are already confirmed), implement read-only month projection in `src/server/db/daily-plan-store.ts`, `src/server/daily-plan-service.ts` and GET /api/months/:month in `src/server/app.ts`, plus client transport in `src/client/api/daily-plans.ts`; derive actual saved results, preserve null/missing/state distinctions and never create day records on read.
- [ ] T044 [US4] After T043, implement `src/client/components/MonthlyScoreCalendar.tsx` and integrate in `src/client/App.tsx`/`src/client/styles.css`: Sunday-first grid, month navigation, approved color legend, selected-day outline, accessible score/state labels, sidebar Calendar focus, loading/retry and draft-safe date selection; refresh after successful save/finalize/reopen.
- [ ] T045 [US4] Verify the approved calendar boundaries, month/year rollover, missing/No plan/open/finalized cases, above-100 behavior, failed reads, keyboard selection and safe navigation in `tests/integration/monthly-scores.test.ts` and `tests/e2e/score-calendar.spec.ts`; record results in `specs/001-daily-planning-scoring/validation.md`.

## Phase 7: Polish & Cross-Cutting Concerns

Verify the combined feature and document actual results without expanding scope.

- [ ] T046 Verify local access boundaries and response contracts in `tests/integration/local-access.test.ts`: Host/Origin/CORS/content-type, no-store, 1 MiB error behavior and sanitized errors/logs; ensure built serving in `src/server/app.ts` cannot expose runtime data.
- [ ] T047 [P] Document Node setup, commands, database location, stopped-server backup/restore and local-only limitations in `README.md`; reconcile runnable commands in `specs/001-daily-planning-scoring/quickstart.md` with the finished scripts.
- [ ] T048 Run typecheck/lint/unit-integration/E2E/build and built-start acceptance from `specs/001-daily-planning-scoring/quickstart.md`; record failures or passing evidence, three-minute planning and 100-task timing in `specs/001-daily-planning-scoring/validation.md`.
- [ ] T049 Review all FR-001–021 and SC-001–008 in `specs/001-daily-planning-scoring/validation.md`; reconcile implementation/spec/plan/tasks, mark only verified tasks complete in `specs/001-daily-planning-scoring/tasks.md`, and leave deferred Things/category/streak/timeline/notes capabilities untouched.

**Checkpoint**: Complete prerequisite tasks before dependent phases.

## Dependencies & Execution Order

```text
Setup → Foundation → US1 → US2 → US3 → US4 → Combined validation
```

US1 depends on shared schemas, storage initialization and server bootstrap. US2 extends US1’s task operations and API. US3 extends that save path with lifecycle and robust history handling. US4 composes the functional controls into the full reference shell. These implementation dependencies are explicit: independent acceptance uses prepared fixtures, not an assumption that every story can be built simultaneously.

Within each story, write its marked test tasks together, then implement in listed order. Tests intentionally fail until their corresponding behavior exists. Integration/end-to-end acceptance and recorded results close the story. Shared-file mutations (App.tsx, the hook, service, store, styles and validation.md) remain sequential.

### Parallel execution examples

- Setup: T004 lint/ignore work and T005 test-fixture configuration can proceed together after T001–T003; coordinate any package.json changes through T002/T003.
- Foundation: T008 date helper/tests and T009 database initialization can proceed together after T006/T007.
- US1: T011 allocation tests and T012 API contract tests can be authored together using the finalized schemas.
- US2: T019 domain scoring tests and T020 completion API tests touch different files.
- US3: T024 persistence tests and T025 lifecycle tests can be authored together with separate temporary database fixtures.
- US4: visual test design T034 can proceed independently of subsequent shell implementation; implementation tasks touching App.tsx remain ordered. The visual tests may use prepared DailyPlan/Result fixtures.

## Implementation Strategy

1. Complete Setup and Foundation; do not bootstrap the app during task generation.
2. Deliver US1 first as the smallest useful planning increment; it is not the complete project MVP.
3. Add US2 scoring, then US3 persistence/lifecycle verification, validating each with isolated fixtures.
4. Finish US4 reference composition, run combined checks and inspect the built UI.
5. Before implementation, run `$speckit-analyze` across spec/plan/tasks as required by the constitution. Resolve findings without silently expanding product scope.

## Coverage and Completion Rules

- US1 covers FR-001–005 and the basic save contract; US2 covers FR-006–009; US3 verifies FR-010–013 and failure-safe navigation/persistence; US4 covers FR-014–021, including all reference-layout decisions.
- Automated and manual tasks collectively cover SC-001–008. Runtime/native binding validation happens in Setup; exact dependency pinning is an implementation deliverable.
- Model field constraints quoted in T006/T007 are authoritative alongside data-model.md; API boundary failures and receipt/revision rules are explicitly included.
- All task boxes remain unchecked until executed and verified. Generated test artifacts do not belong in Git. Record actual evidence and limitations rather than marking planned checks as passing.
- Full Central Command MVP still includes later Things integration and historical aggregate features. This feature does not alter the agreed phase boundaries.

## Shared score-color decision and remaining calendar gate

Colors are confirmed in contracts/score-colors.md; use them throughout the app. Daily score
calculation remains unchanged. T042 can implement the shared mapping independently; calendar
eligibility (finalized/open/provisional) and future-date treatment still need clarification
before T043 onward. No application work has started. Insights remains upcoming content.
