# Tasks: Daily Scoring Streaks

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [model](data-model.md), [API](contracts/streak-api.md), [UI](contracts/streak-ui.md), [quickstart](quickstart.md), constitution v1.0.0.

**Tests**: Required for saved scoring/history and source independence. Write meaningful behavioral tests before implementation and observe failure. Task markers track execution, not approval. No tasks have been executed by generating this file.

**Format**: `- [ ] Tnnn [P?] [USn?] Description with repository-relative paths`. `[P]` permits independent files after prerequisites; it does not authorize subagents.

## Phase 1: Setup

- [X] T001 Review existing scoring/date helpers, service facade, savedTick and responsive placeholders in `src/domain/scoring.ts`, `src/domain/dates.ts`, `src/server/daily-plan-service.ts`, `src/client/hooks/useDailyPlan.ts` and `src/client/App.tsx`; create `specs/005-daily-streaks/validation.md`. Confirm `playwright.config.ts` uses owned temporary storage/backend 5237/source mock 5236; default validation must not contact personal dashboard/source services.

## Phase 2: Foundational Types and Calendar Semantics

**Goal**: Establish date-safe, source-independent input/output boundaries. Complete before story integration.

- [X] T002 Add failing calendar-key tests in `tests/unit/streaks.test.ts` for New York midnight mapping, UTC calendar-key predecessor/successor across weekends, month/year, leap day and both DST transitions; reject invalid date keys and duplicate projection dates. Use injected instants/owned fixtures, never host-local timezone assumptions.
- [X] T003 Define score projection and summary types/validation in `src/domain/streaks.ts` and any needed calendar-key helper in `src/domain/dates.ts`: valid matching dates, unique dates, status editable/finalized, “Non-null scores are finite and nonnegative, uncapped”; summary current is “integer >=0” and best is “integer >=current and >=0”. Use calendar arithmetic, not elapsed 24-hour New York intervals; pass T002 checks without storage or source dependencies.

## Phase 3: US1 — Build a Current Daily Streak (P1)

**Independent Test**: Saved consecutive qualifying days and editable/absent/failing today produce exact current counts in the summary/sidebar; no draft or replay adds an extra day.

- [X] T004 [US1] Add failing rule tests in `tests/unit/streaks.test.ts` for no history, finalized 84/85/95/100/120, editable 90, null/zero, missing yesterday, qualifying today and yesterday grace, finalized failing today, future exclusion and input nonmutation. Include baseline best count so first API/UI increment satisfies best>=current.
- [X] T005 [P] [US1] Add failing endpoint tests in `tests/integration/streaks-api.test.ts` for empty/global summary, server-clock New York asOf captured once, caller query rejection, local Host/Origin/no-store behavior, all-history rather than displayed-month scope, malformed/unsupported saved history failure, zero ThingsReader calls and exact database-row invariance.
- [X] T006 [US1] Implement pure current/best derivation in `src/domain/streaks.ts`: finalized score>=85 qualifies; adjacent calendar keys form runs; current uses qualifying today or, only for absent/editable today, yesterday; finalized failing today returns 0. Best is the longest included run, excluding future dates; no mutation, rounding, normalized denominator or counter. Pass T004 checks.
- [X] T007 [US1] Add `readStreakSummary(db, asOfDate)` in `src/server/db/daily-plan-store.ts`, export through `src/server/daily-plan-service.ts` and expose GET /api/streaks in `src/server/app.ts`. Capture injected/default clock once; use one SELECT of saved date/record through today, validate supported record/scoring shape and reuse result(tasks). Reject unexpected query parameters, fail invalid reads without partial counts, inherit existing error/local/no-store protections, and pass T005 checks. Add no table, migration, writes, receipts or source access.
- [X] T008 [US1] Add initial shared data/loading/error/retry state in `src/client/hooks/useStreaks.ts`, validate summary responses and mount one instance in `src/client/App.tsx` above selected-day rendering. Support savedTick invalidation and last-request-wins/cleanup from the first working increment; extend `src/client/api/daily-plans.ts` with optional AbortSignal support without altering existing callers. Do not derive counts from drafts or receipt payloads.
- [X] T009 [US1] Replace both placeholders with shared current/best presentation in `src/client/components/StreakSummary.tsx` and `src/client/App.tsx`; show genuine 0/1 values and day/day(s), distinguish initial loading/unavailable from zero, retain flame styling and leave unrelated task controls usable. Add initial real endpoint browser acceptance in `tests/e2e/streaks.spec.ts` and record results in `specs/005-daily-streaks/validation.md`.

**Checkpoint**: Initial derived summary works through API/UI using owned fixtures. Basic best/error consistency is present even though deeper corrections and refresh acceptance follow.

## Phase 4: US2 — Reliable Personal Best and Historical Corrections (P2)

**Independent Test**: Runs of 3/7/current 2 yield 2/7; reopening/refinalizing a historical or current day recalculates exact counts and can reduce best, with no unrelated history changes or replay increments.

- [X] T010 [US2] Extend `tests/unit/streaks.test.ts` and `tests/integration/streaks-api.test.ts` with multiple-run best, crossing-month/year/DST/leap runs, reopen splitting a best run, corrected refinalization, failing-today reopen restoring yesterday grace, failed mutations and exact finalize/reopen receipt replay. Verify other days/tasks/categories/weights/results remain unchanged by summary reads and corrections only affect deliberately edited records.
- [X] T011 [US2] Integrate successful saved-history acknowledgments in `src/client/hooks/useDailyPlan.ts` and `src/client/hooks/useStreaks.ts`: successful load/reload must advance savedTick as well as existing save/finalize/reopen/sync successes. Refresh from current stored history after replay, not a stale receipt; failed mutations and in-flight drafts must not optimistically update counts. Ensure load-triggered refresh does not loop or call Things.
- [X] T012 [US2] Add browser scenarios in `tests/e2e/streaks.spec.ts` for finalize/reopen/correction updating both displays within one second of an accepted result, historical browsing preserving global-today meaning, replay without increment, and Reload saved day after an external fixture correction refreshing counts. Check failed finalize/save keeps prior saved-state counts; pass the associated correction/lifecycle acceptance checks, correcting the derivation/read path only if a new case exposes a defect.
- [X] T013 [US2] Record exact current/best sequences, saved-row comparisons and successful load/replay behavior in `specs/005-daily-streaks/validation.md`; confirm `src/server/db/daily-plan-store.ts` never writes or backfills streak metadata and best can decrease after deliberate corrections.

**Checkpoint**: Current/best are consistent with corrected saved history and the existing lifecycle/recovery model.

## Phase 5: US3 — Shared, Accessible and Timely Presentation (P3)

**Independent Test**: Both locations agree across navigation, midnight/resume, stale/error/retry and 375/800/1440px layouts; display refresh performs no Things reads or plan mutations.

- [X] T014 [US3] Add failing controlled-clock/response-order cases in `tests/e2e/streaks.spec.ts`: foreground New York midnight, unchanged-date timer ticks, suspended-page resume, paired focus/visibility events, delayed pre-mutation and previous-date responses, malformed summary, initial/refresh failures, 15-second timeout, retry and unmount cleanup. Count summary GETs separately from source reads/plan writes and keep selected date fixed.
- [X] T015 [US3] Complete refresh lifecycle in `src/client/hooks/useStreaks.ts`: 30-second New York date-change checks only fetch when day changes; focus/visibility return checks/refetches with paired-event deduplication; a newer acknowledgment always supersedes an older read. Use request generations, abort superseded/unmounted requests, a 15-second deadline and explicit retry; ignore superseded aborts/errors and clean up all timers/listeners. No continuous polling reads on unchanged dates, automatic retry loop, Things calls, plan writes or auto-finalization.
- [X] T016 [US3] Complete `src/client/components/StreakSummary.tsx` and `src/client/styles.css` for Current streak/Best counts, “Finalize each day with at least 85% to build your streak.” help, loading/updating/unavailable/stale distinctions and Retry streaks. Expanded/mobile sidebar shows both values; compact 76px rail keeps current outside hidden sidebar-label with accessible/hover details and keyboard help/retry. Use unique help IDs and avoid duplicate live announcements.
- [X] T017 [US3] Add and run responsive/keyboard acceptance in `tests/e2e/streaks.spec.ts` for counts 0/1/999/1000, help/retry and stale/error states at 375px/800px/1440px including mobile drawer and compact rail. Preserve four-card tablet/desktop and two-column mobile summaries, sorting and all weight/score colors. Capture and inspect `artifacts/streaks/` for overflow, clipped counts, overlap and visible focus.
- [X] T018 [US3] Run all clock/failure/race scenarios from `specs/005-daily-streaks/quickstart.md` and record actual timings, request counts, stale labels and limitations in `specs/005-daily-streaks/validation.md`; no claim of precise background timer execution while the browser suspends a page. Active midnight refresh must meet one minute or show explicit failure/stale feedback, and resume must trigger immediate refresh.

**Checkpoint**: Shared state, race protection, refresh behavior and responsive presentation meet FR-007–013 without source side effects.

## Phase 6: Regression and Documentation

- [X] T019 Run typecheck/lint/unit/integration/browser/build commands from `package.json`; record actual results in `specs/005-daily-streaks/validation.md`. Review all-history input integrity, exact no-write/source-spy checks and existing planning/scoring/category/sorting/sync/lifecycle regressions. No live personal data walkthrough is required.
- [X] T020 Update `README.md`, `specs/005-daily-streaks/quickstart.md` and design/contracts with verified current/best semantics, unfinished-today grace, failing finalized today, correction-driven best decrease, saved-history-only authority and foreground/resume refresh. Record initial/stale/error/retry behavior and any untested assistive-technology combinations accurately.
- [X] T021 Review FR-001–013 and SC-001–006 coverage in `specs/005-daily-streaks/validation.md`, reconcile artifacts/implementation, and mark only verified tasks complete in `specs/005-daily-streaks/tasks.md`. Report completed behavior, checks and concrete remaining limitations; do not claim fixture-only work verified personal history.

## Dependencies and Execution Order

```text
Setup → calendar/types → US1 pure/API/shared basic display → US2 corrections/acknowledgments
      → US3 clocks/races/responsive UI → full regression/documentation
```

T002 precedes date/type implementation; T004/T005 precede T006/T007. T014 precedes completing timed
refresh behavior. Basic error/response-order safety belongs to the first working hook, even though US3
adds exhaustive checks. T005 and T004 can be authored independently after Foundation in separate files;
Python and Things adapters need no changes. Shared component/hook/store edits remain sequential.

US1 is the smallest visible increment (real current/best from saved history). US2 and US3 have seeded
independent acceptance scenarios but extend the shared read/hook/UI and are required before completion.
No code, live source reads or plan mutation occurs as part of generating this task file. Run the analyze
step before implementation and resolve findings in these artifacts.

## Requirement Coverage

| Requirement | Primary tasks |
| --- | --- |
| FR-001: finalized >=85, existing fixed budget | T003–T007 |
| FR-002: current anchors and failing today | T004, T006, T010 |
| FR-003: gaps, calendar adjacency, future exclusion | T002–T007, T010 |
| FR-004: all-history best | T005–T007, T010–T013 |
| FR-005: saved acknowledgments, no draft counts | T008–T012 |
| FR-006: corrections/reopen and best decreases | T010–T013 |
| FR-007: consistent summary/sidebar counts | T008–T009, T016–T017 |
| FR-008: global-today meaning while browsing | T005, T008, T012 |
| FR-009: accessible rule, units, visual style | T009, T016–T017 |
| FR-010: replay, reload, midnight and resume | T010–T015, T018 |
| FR-011: initial/stale/error/retry independence | T008–T009, T014–T018 |
| FR-012: no source reads/plan writes | T005–T008, T011, T014–T019 |
| FR-013: responsive large counts and controls | T016–T018 |
| SC-001: qualification and grace boundaries | T004–T007, T010 |
| SC-002: calendar boundary correctness | T002, T006, T010 |
| SC-003: acknowledged updates and replay | T010–T012 |
| SC-004: both displays and large-count layouts | T016–T017 |
| SC-005: no side effects and midnight timing | T005, T014–T015, T018 |
| SC-006: failures and operable retry | T014–T018 |

## Parallel Examples and Implementation Strategy

US1: author pure domain T004 and API T005 tests in parallel after types/calendar prerequisites.
US2: design historical correction API fixtures independently of initial UI acknowledgment fixtures;
execute T010 then T011/T012 without competing edits to the same files.
US3: plan responsive captures independently of clock/race fixture design, but run T014–T018 sequentially
where they share tests/e2e/streaks.spec.ts or the same hook/component/style files.

Use the existing stack and local read boundary; no counter/cache/schema layer. Deliver and validate
incrementally, then run full regressions once the complete feature is ready. Final evidence belongs
in validation.md, not in unchecked promises or generated task counts. Task markers above record verified implementation progress.
