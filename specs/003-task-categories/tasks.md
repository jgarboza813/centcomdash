# Tasks: Things Project Categories

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [category-sync contract](contracts/category-sync.md), [UI contract](contracts/task-category-ui.md), [quickstart.md](quickstart.md) and constitution v1.0.0.

**Tests**: Required for sync, scoring and persistence by the constitution; the approved quickstart also calls for tests before behavior changes. Write the behavioral checks first and observe a meaningful failure before implementation. All checkboxes below track execution, not approval.

**Format**: `- [ ] Tnnn [P?] [USn?] Description with repository-relative paths`. `[P]` denotes independent files after prerequisites; it does not request subagents.

## Phase 1: Setup

**Goal**: Establish evidence tracking and isolated validation using the existing dependencies.

- [X] T001 Confirm Node 24/Python 3.12 and pinned things-api 0.3.2/things-py 1.0.1; create `specs/003-task-categories/validation.md` to record actual source/fixture results and relevant checks. Review `tools/things-api/reader_policy.py` and the pinned read-only connection behavior without reading personal Things data.
- [X] T002 Verify `playwright.config.ts`, `vite.config.ts` and `tests/fixtures/things/mock-server.ts` keep browser/API tests on dedicated backend port 5237 and owned temporary storage; record isolation checks in `specs/003-task-categories/validation.md`. Do not contact the actual dashboard on 3001 or the real Things service in default tests.

## Phase 2: Foundational Contracts and Compatibility

**Goal**: Establish unambiguous category data before story integration. Complete this phase before dependent story work.

- [X] T003 Add failing synthetic relationship checks in `tools/things-api/verify_reader.py` for direct project, heading project, both paths agreeing/conflicting, area-only/no-project, dangling task/project/heading, invalid parent types, blank project name, duplicate project names and completed-today candidates. Verify active/completed missing/invalid relationships fail rather than becoming null, but canceled/trashed tasks with dangling parents remain unresolved without category resolution; completed-yesterday candidates remain excluded.
- [X] T004 Implement a parameterized minimal relationship projection in `tools/things-api/reader_policy.py` using the pinned `things.database.Database` mode=ro connection; resolve only emitted task IDs and required parent references, close connections deterministically, and keep caching local to a response. Resolve heading parents without `things.get(parentId)` descendant expansion; emit `project_category` object/null for Today and tracked by-ID to-dos and pass T003 checks. Do not fetch notes/checklists or add Node-side Things SQLite access.
- [X] T005 Define shared category validation/types in `src/domain/things-sync.ts` and `src/domain/daily-plan.ts`: sourceId is “opaque, nonempty and not assumed UUID”; name is “nonblank, preserves human spelling, punctuation and emoji”; readable active/completed source requires “category: CategorySnapshot | null” with undefined invalid, while canceled/trashed outcomes omit category and bypass project resolution; saved Task permits “category?: CategorySnapshot | null”. Update injected fixtures in `tests/unit/things-import.test.ts` and `tests/integration/things-sync-api.test.ts` to supply explicit source categories without changing legacy saved-task fixtures.
- [X] T006 Add failing wire-contract cases in `tests/integration/things-reader.test.ts` for object/null mapping, missing/unsupported X-Centcom-Categories, undefined/partial/blank category fields, discarded unrelated fields and candidate/tracked consistency. Keep GET-only, timeout/size, timezone and token-safe behavior covered.
- [X] T007 Advertise `X-Centcom-Categories: 1` in `tools/things-api/serve.py`; require it on successful source responses and strictly normalize `project_category` in `src/server/things/http-things-reader.ts`. Update `tests/fixtures/things/mock-server.ts` to advertise capability and return explicit project object/null on both source paths. Fail old/incompatible launchers with actionable THINGS_INCOMPATIBLE before applying changes; pass T006 checks without adding source calls on construction/startup.

**Checkpoint**: Synthetic relationship gate and adapter contract pass. If they fail, revise artifacts before dependent integration; do not normalize ambiguous missing fields into Uncategorized.

## Phase 3: User Story 1 — Recognize a Task's Project (P1)

**Goal**: Explicitly import and display project context beneath each title.

**Independent Test**: Import at least ten eligible tasks across three projects plus no-project membership, including heading children, Today/This Evening and completed-today. Verify every category and existing weight/completion after reload.

- [X] T008 [US1] Add initial-import tests in `tests/unit/things-import.test.ts` for object/null category snapshots, distinct same-name projects, manual/equal-title separation, source ordering and new completed-task categories; verify task identities and scoring inputs remain independent of project names.
- [X] T009 [P] [US1] Add API acceptance in `tests/integration/things-sync-api.test.ts` for categorized import/save/reload, ten-task mixed-project selection, category validation failing atomically, and unchanged import filters/weights/completion. Observe failures before service integration.
- [X] T010 [US1] Initialize category snapshots for newly imported entries in `src/domain/things-sync.ts`; retain project identity separately from display name and explicit null for confirmed no-project. Keep local identity/source links, ordering, selection, assigned-weight and completed initialization rules intact; pass T008 checks.
- [X] T011 [US1] Integrate required source category validation with the existing atomic operation in `src/server/things/sync-service.ts` and retain category in day/receipt serialization through `src/server/db/daily-plan-store.ts`; preserve stored category by local task ID on ordinary PUT and keep client category forgery rejected by strict `src/domain/validation.ts`. Do not add DDL, a category table or a new endpoint. Pass T009 checks.
- [X] T012 [US1] Replace the visible Things arrow/label in `src/client/components/PlanTable.tsx` with project name or Uncategorized below the title, including edit mode. Keep label as descriptive text; retain checkbox/title/weight/remove accessible names and attach a stable linked-task description via aria-describedby explaining Things completion authority. Manual controls must not receive that source description.
- [X] T013 [US1] Add block category styling in `src/client/styles.css` reusing blue #82b6ea and existing secondary-text treatment, with normal wrapping and overflow-wrap for unbroken names; remove inherited nowrap behavior. Keep labels inside the title column and preserve the compact summary/sidebar layout.
- [X] T014 [US1] Add and run initial category browser acceptance in `tests/e2e/task-categories.spec.ts`: project beneath title, no visible “↗ Things” label, manual/no-project/legacy fallback, completed/Evening fixtures and edit-mode context. Record actual results and capture paths in `specs/003-task-categories/validation.md`.

**Checkpoint**: First visible increment works end-to-end; no feature is reported complete without later refresh/history protections.

## Phase 4: User Story 2 — Refresh Category Context Deliberately (P2)

**Goal**: Refresh names and membership safely using the existing explicit sync action.

**Independent Test**: Rename/move/clear project membership across ten explicit syncs; verify stable task identity and weight, correct categories and one updated count per affected task.

- [X] T015 [US2] Add reconciliation tests in `tests/unit/things-import.test.ts` for rename, move, confirmed no-project clear, missing/canceled/trashed preservation, same-name identities, category-only changes and simultaneous title/completion/category changes counted once. Include “Legacy missing → explicit null counts as a metadata update once; repeat null → null is unchanged.”
- [X] T016 [P] [US2] Extend `tests/integration/things-sync-api.test.ts` with category-refresh failure/concurrency cases: invalid source data, state/receipt persistence rollback, stale revision, finalization or midnight during source reads, receipt-only recovery and ten-repeat identity/weight invariance. Compare plan/category/links/sync timestamp/receipts before and after failed operations.
- [X] T017 [US2] Reconcile category identity and name or explicit null in `src/domain/things-sync.ts`; increment updatedCount once per changed entry and preserve categories for unresolved missing/canceled/trashed sources. Integrate through `src/server/things/sync-service.ts` without weakening existing receipt-first replay, eligibility, atomicity or source-authoritative completion; pass T015/T016 checks.
- [X] T018 [US2] Preserve draft category metadata and review lower-revision acknowledgment handling in `src/client/hooks/useDailyPlan.ts` so older save/sync receipts cannot overwrite newer categories or another date's drafts. Keep transport payloads limited to editable task fields and source access limited to explicit sync; no category refresh effects, timers or retries.
- [X] T019 [US2] Extend `tests/fixtures/things/mock-server.ts` with controllable project rename/move/null/failure cases; add browser checks in `tests/e2e/task-categories.spec.ts` for explicit refresh, no reads on mount/reload/focus/date/ordinary edits, failure retaining saved labels, navigation during sync and recovery without a second category read. Include delayed older acknowledgment after a newer categorized revision to verify T018 behavior.
- [X] T020 [US2] Run the ten-repeat project-change walkthrough from `specs/003-task-categories/quickstart.md` using owned fixtures; record identities, weights, counts, source read counts, failure comparisons and unchanged scores in `specs/003-task-categories/validation.md`.

**Checkpoint**: Deliberate category refresh and failure/recovery behavior are verified independently of history scenarios.

## Phase 5: User Story 3 — Review Stable Category History (P3)

**Goal**: Saved categories survive edits/reloads and source changes never rewrite historical context.

**Independent Test**: Finalize a categorized fixture day, alter its source project, review/reload it and compare exact category/score/calendar state. Load legacy/manual tasks and edit an eligible categorized task without category loss.

- [X] T021 [US3] Add persistence/history checks in `tests/integration/planning-api.test.ts` and `tests/integration/things-sync-api.test.ts`: legacy absent field loads without rewrite, existing receipts remain immutable, ordinary rename/reweight/check retains server-owned category, forged category rejected, deletion/reimport uses current category, and finalized/past/future source refresh is blocked before source access. Verify SQL user_version=2 and Plan.schemaVersion=1 remain supported without bulk migration.
- [X] T022 [US3] Complete backward-compatible reads, retained-task save behavior and immutable receipt handling in `src/server/db/daily-plan-store.ts`; preserve missing versus explicit null in stored tasks and category snapshots through finalization/reopening. Ordinary GET/monthly scoring must not backfill, join live project names or read Things. Pass T021 checks.
- [X] T023 [US3] Add browser acceptance in `tests/e2e/task-categories.spec.ts` for saved categories surviving edit/reload, manual/legacy Uncategorized fallback, finalized-day source rename not changing labels, and unchanged score/color/calendar shading. Verify reopening itself does not refresh source context.
- [X] T024 [US3] Verify rendered label hierarchy and accessibility at 375px, 800px and 1440px in `tests/e2e/task-categories.spec.ts` using 80-character, unbroken, emoji and markup-like names; inspect saved captures under `artifacts/task-categories/`. Check no title/control overlap or horizontal overflow, correct linked descriptions, unchanged keyboard operation and labels in edit mode.
- [X] T025 [US3] Record saved-history/legacy receipt comparisons, category-preserving ordinary edits and rendered review results in `specs/003-task-categories/validation.md`; distinguish fixture evidence from any explicitly run live diagnostic.

**Checkpoint**: All three stories meet their independent criteria; no historical data or scoring policy has been altered.

## Phase 6: Polish and Cross-Cutting Validation

- [X] T026 Update `README.md`, `tools/things-api/README.md` and `specs/003-task-categories/quickstart.md` with explicit launcher restart/capability instructions, project/heading/no-project semantics, unchanged sync trigger rules, snapshot history behavior and additive-field rollback limits. Keep charts/management/filtering explicitly outside scope; do not claim implementation checks that have not run.
- [X] T027 Run typecheck/lint/unit/API/browser/build commands from `package.json` and the synthetic command in `specs/003-task-categories/quickstart.md`; record actual counts/results and review FR-001–012/SC-001–005 coverage in `specs/003-task-categories/validation.md`. Verify default tests never contact personal services/storage; fix applicable failures before completion.
- [X] T028 Review `tools/things-api/check-sync.ts` for optional category-count-only diagnostics against the real read-only service using an owned temporary dashboard database; document whether run, exact pins, sanitized results and unverified live cases in `specs/003-task-categories/validation.md`. Never change personal Things tasks or import into the actual dashboard to manufacture test evidence. Back up the stopped actual dashboard before any real-data upgrade; user-dashboard imports remain explicit button actions.
- [X] T029 Review implementation/artifact consistency against `specs/003-task-categories/spec.md`, `plan.md`, contracts and `tasks.md`; mark only verified tasks complete, document any remaining acceptance in `specs/003-task-categories/validation.md`, and report the completed behavior and limitations.

## Dependencies and Execution Order

```text
Setup (T001–T002)
  → Synthetic source/schema/capability foundation (T003–T007)
  → US1 initial import and labels (T008–T014)
  → US2 deliberate refresh (T015–T020)
  → US3 persistence/history review (T021–T025)
  → Full regression/docs (T026–T029)
```

The source projection and adapter compatibility gate precede dependent merge/UI work. T003 is authored
before T004; T006 before T007. Story behavioral tests precede their implementation. T011 establishes
basic safe persistence; T021/T022 harden legacy/history cases rather than delaying safe saves until US3.
US2 and US3 use US1's shared task field and UI, but each has an independent seeded acceptance test.
Retain existing historical protections from the first functioning increment.

## Parallel Opportunities

- US1: T008 pure merge tests and T009 API tests can be authored independently after Foundation.
- US2: T015 merge tests and T016 API failure tests can be authored independently after US1.
- US3: API/history checks can be designed independently of rendered fixture review; execute T023/T024
  browser work sequentially because both edit `tests/e2e/task-categories.spec.ts`.
- Keep Python policy/verification, shared domain fixtures and store/hook edits dependency-ordered;
  a `[P]` marker does not authorize competing edits to the same files or new agent delegation.

## Implementation Strategy

First deliver the smallest visible slice: explicit project-backed task labels with saved snapshots
(Foundation + US1). Then verify deliberate refresh and stable historical context as separate increments.
Use the current Node/Python environments and dependencies; no registry, new service, chart, management
UI or DDL migration is needed. Run the analyze step before implementation and resolve findings in the
existing artifacts. Do not read the user's Things library simply to generate these tasks.

## Requirement Coverage

| Requirement | Primary tasks |
| --- | --- |
| FR-001: category identity/name, heading resolution | T003–T010 |
| FR-002/003: below-title labels and fallback | T012–T014, T023–T024 |
| FR-004: explicit sync and existing source selection | T007, T009–T011, T016–T020, T027 |
| FR-005: refresh without identity/weight changes, counts | T015–T020 |
| FR-006: explicit null vs failure/unresolved | T003–T007, T015–T017 |
| FR-007: reload/edit/legacy preservation | T011, T018, T021–T023 |
| FR-008: stable saved history | T016, T021–T023, T025 |
| FR-009: unchanged scoring/order/colors | T008–T011, T015–T017, T020–T023, T027 |
| FR-010/012: responsive names and source disclosure | T012–T014, T024 |
| FR-011: projects distinct from headings/areas and duplicate names | T003–T010, T015 |
| SC-001: mixed-project import/reload | T009, T014 |
| SC-002: visible hierarchy and responsive long labels | T012–T014, T024 |
| SC-003: ten-repeat stable identities/weights | T015–T020 |
| SC-004: stable historical labels and results | T021–T025 |
| SC-005: failure atomicity and zero background reads | T006–T007, T016, T019, T027 |

Implementation progress is tracked above; actual validation evidence is recorded in validation.md.

Analysis A1 is resolved: unresolved canceled/trashed status precedes category resolution and required-field validation (T003–T007, T015–T017).

Completion: all 29 tasks are implemented and verified. Category-specific browser tests are in tests/e2e/task-categories.spec.ts. Fixture and live evidence, including limitations, is in validation.md.
