# Implementation Plan: Things Project Categories

**Branch**: `main` (actual Git branch; setup script's logical feature ID is `003-task-categories`) | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-task-categories/spec.md`

## Summary

Save a source-project category snapshot on each daily task and render its name below the title,
replacing the blue Things label. Extend the existing read-only Python reader policy to provide
an explicit validated project object or null, resolving containing projects for heading children through a narrow read-only relationship projection in Python, including detection of dangling references.
Require a category capability header so an old service cannot silently clear saved categories.
Keep source access within explicit sync and persist categories atomically with the existing day,
links, sync metadata and receipt. No category registry, management page or chart is introduced.

## Technical Context

**Language/Version**: TypeScript 6, Node 24; existing Python 3.12 reader environment.

**Primary Dependencies**: Existing React 19, Express 5, Zod 4, better-sqlite3; pinned things-api 0.3.2/things-py 1.0.1. No new dependencies.

**Storage**: Existing SQLite day JSON; additive optional task.category with null representing confirmed no-project. No DDL migration or bulk rewrite; legacy missing fields render Uncategorized.

**Testing**: Vitest unit/API tests, pinned-library synthetic Python checks, Playwright UI tests, rendered desktop/mobile review.

**Target Platform**: Local Mac read-only Things service and browser dashboard at 375px/tablet/desktop widths.

**Project Type**: Existing local web application with separate loopback Python source service.

**Performance Goals**: Existing 30-second aggregate HTTP timeout/4 MiB budget; no source reads on ordinary page actions. Verify ten-task, three-project selection and ten repeat operations; preserve current interactive scoring performance.

**Constraints**: Today/This Evening plus eligible completed-today selection; ❗ and weight rules unchanged. No source writes, polling, automatic retry, historical backfill or scoring changes. Project data must be explicit and compatible; unresolved task policy preserves prior category.

**Scale/Scope**: One user's daily tasks; category display/import/refresh/history only. Registry, charts, category filtering and manual assignment remain outside this increment.

## Constitution Check

*Pre-research and post-design review: PASS for all six principles.*

| Principle | Design evidence |
| --- | --- |
| I. Specify before coding | Reviewed spec precedes this plan; tasks/analyze precede implementation. |
| II. Commitment model | Category changes never alter weights or scoring; regression comparisons required. |
| III. Focused MVP | Task context supports daily review; no category analytics/management expansion. |
| IV. Historical accuracy | Task-level snapshot; no joins to mutable category registry; no GET/backfill writes. |
| V. Simple and verified | Reuse day JSON and sync transaction; synthetic heading checks, atomicity/history tests. |
| VI. Effortless daily use | Below-title blue label, wrapping at 375px, keyboard names retained, accessible source-authority disclosure. |

No exceptions or constitution amendment required. Source field ambiguity is resolved in the planned
reader contract; implementation must pass the synthetic compatibility gate before connecting it.

## Project Structure

### Documentation (this feature)

```text
specs/003-task-categories/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── category-sync.md
    └── task-category-ui.md
```

Implementation tasks are recorded in tasks.md; validation evidence is in validation.md.

### Source Code (repository root)

```text
src/domain/{daily-plan,things-sync,validation}.ts
src/server/things/{http-things-reader,sync-service}.ts
src/server/db/daily-plan-store.ts
src/client/hooks/useDailyPlan.ts
src/client/components/PlanTable.tsx
src/client/styles.css
tools/things-api/{reader_policy,serve,verify_reader}.py
tests/unit/things-import.test.ts
tests/integration/{things-reader,things-sync-api,planning-api}.test.ts
tests/fixtures/things/mock-server.ts
tests/e2e/{things-sync,task-categories}.spec.ts
```

**Structure Decision**: Extend the existing reader/domain/store/UI paths. The browser continues
to omit server-owned source metadata from ordinary save input. Preserve category from current
saved task by local ID when rebuilding ordinary PUT tasks. Guard asynchronous acknowledgments
against older revisions; old receipts remain immutable.

## Delivery and Validation Sequence

1. Synthetic source-contract checks for direct project, heading project, no-project and invalid pairs;
   then extend Python policy and advertise capability on the repository launcher.
2. Extend normalized source/task types and pure merge tests; category-only updates count once.
3. Preserve task category on normal edits and JSON persistence; check legacy days and receipts,
   atomic failures, finalized history and stale responses without upgrading the SQL schema.
4. Replace label and retain accessible linked-task disclosure; validate long text and manual fallback.
5. Run appropriate typecheck/lint/unit/API/browser/build checks and inspect rendered UI.
   Optional live diagnostic must be read-only and use an owned temporary dashboard database;
   ordinary automated tests must never contact the personal source or actual dashboard database.

## Complexity Tracking

No constitutional violations. The only integration extension is explicit source category enrichment
and capability negotiation, needed because upstream omitted fields cannot represent project state
reliably for heading children. No separate category table or additional service is justified.

## Analysis remediation A1 — unresolved-task precedence

Canceled or trashed source tasks are classified as unresolved before project resolution. Emit no
project category for those outcomes; the dashboard preserves their saved category and does not
attempt to clear it. Missing tasks retain the existing explicit missing outcome. Required category
object/null validation and project-resolution failures apply to readable active/completed tasks
only. An absent category on an active/completed task remains incompatible and fails the operation.
A dangling project on a canceled/trashed task must not fail other valid updates in the same sync.
