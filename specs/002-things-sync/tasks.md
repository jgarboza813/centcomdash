# Tasks: Sync with Things

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [model](data-model.md), [HTTP adapter](contracts/things-adapter.md), [API](contracts/sync-api.md), [UI](contracts/sync-ui.md), [quickstart](quickstart.md), and constitution v1.0.0.

**Tests**: Included under the constitution’s mandatory sync/persistence/scoring verification. Write behavioral tests before the associated implementation and observe failure first. Checkboxes track implementation/verification completion, not user approval. See validation.md for evidence and the remaining opt-in acceptance item.

**Format**: `- [ ] Tnnn [P?] [USn?] Description with file paths`. Paths are repository-relative. `[P]` permits same-phase independent files after preceding prerequisites; it does not authorize unrequested subagents.

**Scope**: Read-only jaydenk/things-api integration, explicit Sync with Things activation only, exact Today/❗ selection, XL/L/M/S weight tags and Things-authoritative completion. No automatic reads/retries, source writes, public exposure, Mac scripting or broad library replication.

## Phase 1: Setup and Compatibility Gate

Verify the approved external dependency before implementing against assumed payloads.

- [X] T001 Inspect a released things-api package/source and pin its tested version plus things.py dependencies in `tools/things-api/requirements.lock`; document a separate Python 3.12+ environment, service start/stop and Node 24 prerequisites in `specs/002-things-sync/quickstart.md`. Do not modify the existing independent checkmark CSS fix.
- [X] T002 Configure the pinned service for explicit loopback/read-only operation and verify its effective configuration in `specs/002-things-sync/validation.md`: THINGS_API_HOST=127.0.0.1, port 5225, private THINGS_API_TOKEN, no THINGS_AUTH_TOKEN inherited from environment/config. Never put a token in Git, CLI arguments or browser configuration.
- [X] T003 Perform the opt-in compatibility probe and record results in `specs/002-things-sync/validation.md`: GET /health read=true/write=false, /today completeness, by-ID completed/canceled/trashed/missing behavior, stable IDs and exact ❗/XL/L/M/S tag representation; verify effective service TZ=America/New_York and actual Today semantics around midnight/DST, rejecting unknown or mismatched alignment; capture sanitized response shapes in `tests/fixtures/things/`. Stop dependent adapter work if any required behavior is unsupported; never infer missing fields.
- [X] T004 Document server-only CENTCOM_THINGS_API_URL/CENTCOM_THINGS_API_TOKEN setup, explicit environment loading, local-only service lifecycle and compatibility upgrade policy in `README.md` and `specs/002-things-sync/quickstart.md`; extend `.gitignore` for the external environment/config without hiding the pinned lockfile.

**Checkpoint**: Complete this phase and its independent acceptance checks before dependent work.

## Phase 2: Foundational Contracts and Persistence

Establish schemas, migration and injectable test boundaries. All story work depends on this phase and successful compatibility verification.

- [X] T005 Define SourceSnapshot/SourceTask/TrackedOutcome/SyncResult schemas in `src/domain/things-sync.ts`: “nonempty sourceId”, “nonblank title”, “direct tag-name array”, “open/completed/canceled”, and “one outcome for every requested linked source ID”; duplicate contradictory IDs, malformed fields, missing outcomes or partial output fail the snapshot. Define ThingsReader in `src/server/things/things-reader.ts` and injected fixture readers in `tests/integration/things-sync-api.test.ts`.
- [X] T006 [P] Write migration and v1-envelope compatibility tests in `tests/integration/things-migration.test.ts`: preserve day JSON/finalized history/legacy receipts, rollback failed upgrade, refuse unknown versions, and normalize absent things metadata without erasing newer acknowledged state.
- [X] T007 Add `src/server/db/migrations/002-things-sync.ts` and update `src/server/db/database.ts` to migrate user_version 1→2 transactionally and enable foreign_keys. Links require date “foreign key to days.date”, task_id “Existing local UUID in that day’s task array”, source_id “Nonempty Things identifier, opaque string, not assumed UUID”; primary key (date, task_id), unique (date, source_id). Sync state has one row per date and nonnegative counts; preserve existing aggregates and receipts.
- [X] T008 Extend `src/domain/daily-plan.ts` and `src/server/db/daily-plan-store.ts` with server-owned things.taskLinks and nullable lastSuccessfulSync metadata. Existing manual/virtual days return empty links/null; ordinary PUT preserves retained links and removes deleted-entry links, rejects browser-forged source metadata, and supports old receipts lacking the new fields. UpdatedCount counts each changed entry once; unresolved IDs count once across overlaps.
- [X] T009 Add injectable ThingsReader/clock configuration at `src/server/app.ts` and `src/server/things/sync-service.ts`; adapter construction, GET requests, app startup and default automated tests must perform no live service reads. Provide isolated database and mock-HTTP fixture support in `tests/fixtures/things/`.

**Checkpoint**: Complete this phase and its independent acceptance checks before dependent work.

## Phase 3: User Story 1 — Import Today’s Commitments (Priority: P1)

Import exact-tag Today tasks without retyping or duplicates. Independent test: ten valid candidates plus untagged/non-Today/invalid-weight/equal-title fixtures produce only the expected linked entries and correct allocation; ten repeat clicks preserve identity/weights.

- [X] T010 [P] [US1] Write selection/initial-merge tests in `tests/unit/things-import.test.ts` for exact ❗ tag (not title/substrings/inherited substitutes), exactly one uppercase XL/L/M/S → 20/10/5/1, missing/conflicting weights skipped and unresolved, equal titles/different IDs, manual entries, source order, recurring distinct IDs and repeated-import identity (FR-003/004/006).
- [X] T011 [P] [US1] Write HTTP-reader contract tests in `tests/integration/things-reader.test.ts` using sanitized fixtures: fixed loopback base, encoded ID path segment, GET-only bearer headers, rejected redirects, absent token errors, aggregate 30s/4 MiB bounds and discarded unrelated fields; no source writes or startup health probes (FR-009/010/013).
- [X] T012 [P] [US1] Write failing import/replay/recovery endpoint contract tests in `tests/integration/things-sync-api.test.ts` before service/routes: valid request, rejected client metadata, exact receipt-first replay after midnight/finalization, recovery-only missing/active receipt outcomes with zero source reads/writes, and source-date mismatch failures.
- [X] T013 [US1] Implement `src/server/things/http-things-reader.ts` using Node fetch and server-only configuration: literal loopback URL with allowed scheme/port and no userinfo/query/path overrides, GET /today and tracked by-ID reads, strict compatibility-verified response mapping, incomplete→open, exact tags, abort on aggregate deadline/size/error and no automatic retries. Token never reaches browser/logs/receipts; no direct database or Mac scripting code.
- [X] T014 [US1] Implement pure import merge in `src/domain/things-sync.ts`: append valid new entries with new local UUIDs and unique per-day source links, initialize from source title/status, preserve assigned weights for existing identities, skip/report invalid candidates, and never deduplicate against manual titles. Never import new canceled/trashed entries; report unresolved.
- [X] T015 [US1] Implement first complete sync operation in `src/server/things/sync-service.ts` and transactional apply in `src/server/db/daily-plan-store.ts`: receipt-first replay before date/lifecycle/revision checks, per-day in-flight guard, validate today/revision/editable before reads and again at commit, read outside transaction, commit plan/links/state/receipt together, release guard on every outcome. Empty/no-op success still records counts/time/revision; no partial write.
- [X] T016 [US1] Expose POST /api/days/:date/things-sync in `src/server/app.ts` with UUID requestId/nonnegative expectedRevision only, existing Host/Origin/JSON/no-store checks and contract response {day,sync}; reject client source IDs/URL/token/filter fields. Add the recovery-only route from `contracts/sync-api.md`; pass the previously written tests in `tests/integration/things-sync-api.test.ts`. Recovery never falls through to fresh sync.
- [X] T017 [US1] Implement the sole click handler in `src/client/components/SyncWithThings.tsx`, using the existing transport in `src/client/api/daily-plans.ts`, and per-date sync integration in `src/client/hooks/useDailyPlan.ts`: reserve day before draining autosaves, prevent edits/lifecycle/overlap while running, block source call on failed flush, preserve the captured date through navigation and retain original uncertain operation IDs/date/revision for explicit recovery-only clicks, available even after midnight/finalization. Never overwrite newer acknowledged state with old receipt data.
- [X] T018 [US1] Enable header action in `src/client/App.tsx` and keep it visible at 375px in `src/client/styles.css`; add busy/eligibility explanation and basic success/unresolved result region. Run import acceptance in `tests/e2e/things-sync.spec.ts` and record ten-task timing/repeat-import outcomes in `specs/002-things-sync/validation.md`.

**Checkpoint**: Complete this phase and its independent acceptance checks before dependent work.

## Phase 4: User Story 2 — Refresh Completion Safely (Priority: P2)

Things completion controls linked tasks while preserving commitments. Independent test: seed linked/manual/finalized fixtures and reconcile source states, including completed tasks outside Today, without altering weights or finalized records.

- [X] T019 [P] [US2] Write completion reconciliation tests in `tests/unit/things-import.test.ts`: open↔completed overrides local state, lookup outside Today, ❗ removal keeps link, source weight-tag changes preserve assigned weights, rename preserves identity, missing/canceled/trash keep existing completion, and readable rescheduled-open sets incomplete while reporting membership unresolved (FR-005/007/008).
- [X] T020 [P] [US2] Write history/link integrity tests in `tests/integration/things-sync-api.test.ts`: finalized request rejected before source access, other dates/manual tasks unchanged, ordinary PUT rename/reweight retains links, removal clears link, explicit later reimport stays unique, and legacy receipt replay cannot erase new metadata (FR-006/008/012).
- [X] T021 [US2] Extend `src/domain/things-sync.ts` and `src/server/things/http-things-reader.ts` to reconcile every server-tracked source ID independently of Today membership; update readable title and authoritative open/completed state, retain weight/local ID and flag ambiguous/missing/canceled/trash/rescheduled outcomes without assuming completion from absence.
- [X] T022 [US2] Integrate reconciled results through `src/server/things/sync-service.ts` and `src/server/db/daily-plan-store.ts`; reuse existing scoring/colors and preserve all finalized records. Ensure requests on historical/future dates introduce no past backfill or new imports.
- [X] T023 [US2] Add linked-task indicator and “Things controls completion on sync” disclosure in `src/client/components/PlanTable.tsx`; update captured date’s acknowledged/draft/link metadata in `src/client/hooks/useDailyPlan.ts` and refresh derived views without triggering another source read.
- [X] T024 [US2] Run completion/reopen/finalized-history acceptance in `tests/e2e/things-sync.spec.ts` and record before/after identities, weights, task counts, score/color and calendar invariance in `specs/002-things-sync/validation.md`.

**Checkpoint**: Complete this phase and its independent acceptance checks before dependent work.

## Phase 5: User Story 3 — Understand Results and Failures (Priority: P3)

Make results clear and all failures safe. Independent test: inject source/network/storage failures and concurrent changes, then explicitly click again; saved data and last-success time remain intact with no background reads or duplicate retries.

- [X] T025 [P] [US3] Write failure/concurrency tests in `tests/integration/things-sync-api.test.ts`: 401/403, unavailable/unreadable source, 429, timeout, oversized/malformed/partial payload, source 404 versus read failure, receipt/link/state write rollback, stale revision/finalization/midnight during read, overlapping tabs and exact committed replay after restart/midnight/finalization, missing/active receipt recovery without source reads, and source timezone mismatch (FR-009/010/011).
- [X] T026 [P] [US3] Write trigger-only browser tests in `tests/e2e/things-sync.spec.ts`: zero sync POSTs/source calls on mount/reload/navigation/local edits/finalize/reopen/focus/timers/source changes; one allowed mouse/touch/keyboard activation starts one operation, repeated activation cannot overlap, and waiting after failure never retries (FR-001, SC-006).
- [X] T027 [US3] Complete structured failure mapping and token-safe diagnostics in `src/server/things/http-things-reader.ts`, `src/server/things/sync-service.ts` and `src/server/app.ts` for every code in contracts/sync-api.md; no failed response writes a success timestamp or schedules a retry.
- [X] T028 [US3] Complete per-date idle/running/success/failure and lost-response replay handling in `src/client/hooks/useDailyPlan.ts` and `src/client/components/SyncWithThings.tsx`; retry only through the same button; uncertain attempts use the receipt-only recovery endpoint even on past/finalized dates, no effects/timers or generic autosave retry can issue a sync read, and late responses cannot overwrite another selected date.
- [X] T029 [US3] Finish accessible result/count/time/unresolved list and actionable auth/service/database/conflict messages in `src/client/components/SyncWithThings.tsx` and `src/client/styles.css`; retain last success after failure and explain server-side configuration without displaying secrets or requesting a Things write token.
- [X] T030 [US3] Verify keyboard/focus, touch-sized visible button, status/error announcements and no horizontal overflow at 375px/1440px in `tests/e2e/things-sync.spec.ts`; inspect rendered captures under `artifacts/things-sync/` and record results in `specs/002-things-sync/validation.md`.
- [X] T031 [US3] Run all failure/trigger acceptance including failed pre-sync autosave and navigating while sync runs in `tests/e2e/things-sync.spec.ts`; record exact read counts and atomic before/after comparisons in `specs/002-things-sync/validation.md`.

**Checkpoint**: Complete this phase and its independent acceptance checks before dependent work.

## Phase 6: Polish and Cross-Cutting Validation

Verify the full increment and document the operational dependency.

- [X] T032 Run existing and new typecheck/lint/unit/integration/browser/build checks from `package.json` and `specs/002-things-sync/quickstart.md`; record actual outcomes and source fixture versus live-test distinctions in `specs/002-things-sync/validation.md`. No real Things service is read by the default suite.
- [ ] T033 Complete the opt-in local-service walkthrough in `specs/002-things-sync/quickstart.md` with designated test tasks, recording pinned service/library/Things versions, read-only loopback health, exact tags, completion lookup, no duplicate imports and unavailable/auth failure recovery in `specs/002-things-sync/validation.md`; do not claim fixture-only results prove live compatibility.
- [X] T034 Review FR-001–013 and SC-001–006 against evidence in `specs/002-things-sync/validation.md`; update `README.md` and `specs/002-things-sync/quickstart.md` with tested setup, stopped-database backup, service start/stop and upgrade instructions, and mark only verified tasks complete in `specs/002-things-sync/tasks.md`.

**Checkpoint**: Complete this phase and its independent acceptance checks before dependent work.

## Dependencies and Execution Order

```text
Compatibility/setup → Foundation → US1 imports → US2 completion → US3 failures/feedback → Full validation
```

The live compatibility gate precedes concrete HTTP response mapping. If it fails, stop and revise the adapter/specification rather than build against invented field shapes. Default mocked tests remain useful but cannot satisfy this gate.

US1 requires shared schemas, persistence and HTTP fixtures. US2 extends its merge/identity path; US3 hardens and verifies the same request path. Basic failure atomicity, explicit triggers and finalized protection are required from the first working import, even though exhaustive failure testing appears in US3. Story acceptance can be tested independently using seeded fixtures; story implementation is deliberately incremental, not all parallel.

Within a phase: tests first, then domain/adapter/store/service, endpoints, UI integration and acceptance checks. Tasks editing the same App/hook/store/style files remain sequential. No-op sync records metadata/revision but leaves task results unchanged. No migration/live-source work occurs as part of task generation.

## Parallel Execution Examples

- Foundation: migration tests can be authored after the shared schema task while fixture-only test design proceeds; schema implementation still waits for tests.
- US1: T010 pure import tests and T011 mock-HTTP contract tests touch separate files and can be authored together after Foundation.
- US2: T019 completion tests and T020 history/link tests can be authored together using prepared fixtures.
- US3: T025 failure/concurrency tests and T026 trigger-only browser tests use separate files/isolated fixtures; production changes follow those test definitions.

## Implementation Strategy

1. Verify/pin the third-party service and pass the compatibility gate before concrete source mapping.
2. Build Foundation and US1 as the first useful increment: explicitly import and weight today’s selected tasks.
3. Add US2 source-authoritative completion without changing historical commitments.
4. Finish US3 trigger/failure/accessibility verification, then full regression and opt-in live acceptance.
5. Run `$speckit-analyze` before `$speckit-implement`. Resolve findings through the existing spec/plan/contracts, preserving the agreed scope.

## Requirement Coverage

| Requirements | Primary tasks |
| --- | --- |
| FR-001, SC-006: button-only sync and no background retries | T017, T026, T028, T031 |
| FR-002: today/editable and rollover checks | T015–T017, T022, T025 |
| FR-003/004/006, SC-001/002: selection, weights, identity | T005–T008, T010–T018 |
| FR-005/007/008/012, SC-003/005: source authority and history | T019–T024 |
| FR-009/010/011/013, SC-004: atomicity, failures, feedback and data handling | T002–T009, T011–T016, T025–T034 |

No live integration is claimed ready until the compatibility and final live-validation tasks are complete. The independent existing CSS fix remains outside this feature. Implementation and validation outcomes are recorded in validation.md; T033 retains the opt-in live transition walkthrough.

## Analysis remediation

API contract tests now precede concrete adapter/merge/service/routes. Receipt lookup precedes
eligibility checks; recovery-only behavior is explicit and cannot initiate reads. The same UI
button offers recovery after midnight/finalization. Source timezone alignment is part of the
compatibility gate and failure tests. 33 tasks are complete. T033 remains an opt-in live transition walkthrough; no personal Things tasks were modified to manufacture acceptance evidence.

## Implementation evidence note

Test cases were consolidated into the files named above. Internal snapshots contain candidates/tracked only; completedAt belongs to the committed SyncResult rather than an unused transport field. The temporary-dashboard live import/repeat check passed. See validation.md for precise fixture/live distinctions and remaining personal-data acceptance.

## Today / This Evening regression

- [X] T035 Explicitly include Today and This Evening in the specification/contracts; verify both buckets through the pinned /today reader using tools/things-api/verify_reader.py and tests/integration/things-reader.test.ts. Cover evening import in the button-driven browser fixture. No additional endpoint or automatic source access is introduced.

- [X] T036 Fix initial import of eligible tasks already completed today. Add a bounded completed-task Today reader in tools/things-api/reader_policy.py, install it in serve.py, verify today/yesterday synthetic membership, and test completed initialization in tests/unit/things-import.test.ts.
