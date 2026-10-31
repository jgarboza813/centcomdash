# Implementation Plan: Daily Planning and Scoring

**Branch**: `main` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-daily-planning-scoring/spec.md`

## Summary

Build a local single-user dashboard for manually planning tasks, tracking weighted completion,
and explicitly finalizing/reopening days. Use React + TypeScript + Vite for the interface,
an Express server bound to loopback, and SQLite for authoritative records. Keep this in one
npm project with shared domain logic. No application implementation is included in this plan.

The supplied dashboard image now governs visual composition: sidebar/header, four summary
cards, large plan table, right-side Progress/Category/horizontal Guide/Notes/Insights stack, and a split
Timeline/monthly-score-calendar region under the left plan. Per Jose's
scope decision, extra capabilities remain follow-ups with labeled reserved areas. See
[reference reconciliation](design-reference.md) and [UI contract](contracts/daily-dashboard.md).
The fixed-budget score replaces the image's normalized completion percentages.

The setup helper reported `001-daily-planning-scoring` as its feature identifier; Git's actual
branch remains `main`. Feature discovery uses `.specify/feature.json` independently of Git.

## Technical Context

**Language/Version**: TypeScript in strict mode; Node.js 24 LTS target, npm.
Pin exact compatible package versions and commit the lockfile during implementation.

**Primary Dependencies**: React, Vite with its React plugin, Express 5, better-sqlite3;
Zod for boundary validation; tsx for server development. Native HTML controls, CSS grid, and inline SVG rings provide
accessible interactions and dark-theme tokens. React state/reducer is sufficient for this slice.

**Storage**: SQLite file at `data/central-command.sqlite` (ignored by Git), configurable via
`CENTCOM_DB_PATH`. Transactional schema migrations, preserved weights, versioned score rules,
optimistic concurrency, and idempotent mutation receipts.

**Testing**: Vitest for domain and database/service integration tests; Playwright for real
browser workflows, failure/retry behavior, reload persistence, and responsive/keyboard checks.
Use temporary file-backed databases for persistence tests, never the user's data.

**Target Platform**: macOS local use in current desktop Chrome; responsive validation at
375px and 1440px. Both dev and built servers bind to `127.0.0.1` only.

**Project Type**: Local web application, one repository/package, one daily dashboard route.

**Performance Goals**: User-visible recalculation within one second for up to 100 tasks;
nine-task planning example within three minutes. No background network dependency for scoring.

**Constraints**: Fixed XL/L/M/S weights; score equals completed points out of 100; values can
exceed 100. Historical records change only after explicit reopening. No authentication or
public hosting in this slice. Reject untrusted Host/Origin values on local endpoints and do
not enable broad CORS. Things integration and aggregate views remain later MVP features.

**Scale/Scope**: One user, daily plans with 100 tasks as the tested performance workload;
no arbitrary 100-task product limit. Multiple browser tabs must not silently overwrite history.

**Environment prerequisite**: Detected Node v16.19.0/npm 8.19.3 are insufficient for this
selected toolchain. Activate Node 24 before installing dependencies; do not change system Node
as part of planning. Capture the runtime in `.nvmrc` and package engine constraints later.

## Constitution Check

Gate assessment before research and after design:

| Principle | Before | After design and supporting evidence |
| --- | --- | --- |
| I. Specify before coding | Pass: spec and decisions recorded | Pass: design only; tasks/analysis precede implementation |
| II. Commitment model | Pass: fixed weights and score confirmed | Pass: shared pure calculations and contract examples 96/80/120 |
| III. MVP scope | Pass: bounded daily slice | Pass: manual input, date review; Things and aggregates deferred; embedded calendar added pending rules |
| IV. Historical accuracy | Pass: explicit finalize/reopen | Pass: transactions, preserved weights/rules, revisions, retry receipts |
| V. Simplicity and verification | Pass: no existing code to preserve | Pass: one package, one local process/database; focused tests |
| VI. Daily usability | Pass: observable UI criteria in spec | Pass: native controls, status text, keyboard and viewport validation |

No constitutional violations identified. Shared score colors are confirmed in contracts/score-colors.md. Calendar historical
eligibility and future-date presentation still need clarification before dependent work. Runtime upgrade is a concrete
setup prerequisite, not an unresolved product requirement. Synchronization tests apply when
the Things integration feature is specified; this slice tests saves and transitions.

## Project Structure

### Documentation (this feature)

```text
specs/001-daily-planning-scoring/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── design-reference.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── daily-plans-api.md
    └── daily-dashboard.md
```

`tasks.md` will be generated by the next Spec Kit step.

### Source Code (repository root, proposed)

```text
src/
├── client/
│   ├── App.tsx
│   ├── components/
│   ├── hooks/useDailyPlan.ts
│   └── styles.css
├── domain/
│   ├── daily-plan.ts
│   ├── scoring.ts
│   └── validation.ts
└── server/
    ├── index.ts
    ├── app.ts
    ├── daily-plan-service.ts
    └── db/
        ├── database.ts
        ├── daily-plan-store.ts
        └── migrations/
tests/
├── unit/
├── integration/
└── e2e/
data/                  # ignored runtime data
package.json
package-lock.json
index.html
vite.config.ts
playwright.config.ts
tsconfig.json
.nvmrc
```

**Structure Decision**: One npm package avoids monorepo tooling. Shared domain code keeps
preview and authoritative calculations consistent. The small server is justified by durable
file-based history and transactional finalization, not speculative commercial scaling. It
serves the built client; Vite proxies `/api` during development. No ORM, routing framework,
external state store, container, or cloud service is necessary for this feature.

## Validation Strategy

- FR-001–005: day/date rules, title/weight validation, nine-task 96% example, exact 100%,
  101%/120% plans, independent duplicate-title tasks.
- FR-006–009: toggle, rename, reweight and remove completed entries; 25%, 20%, 80%, 96%,
  120% scores, and “No plan” versus nonempty 0%.
- FR-010–013: temporary-file database reopened across connections/process restart,
  day isolation, atomic failure rollback, request replay, stale revisions, finalized edit
  rejection, reopening and refinalization, empty/incomplete finalization, midnight stability.
- FR-014–016: real browser task flow and rendered inspection at both viewport widths;
  keyboard-only controls/focus, status announcements, and distinct empty/loading/error states.
- FR-017–020: reference composition at desktop/mobile widths, table view/Edit Plan/Done,
  add form and direct status toggles, disabled future actions, fixed-budget ring/card values,
  commitment-based guide copy, and discoverable lifecycle actions in the day menu.
- SC-008: rendered comparison with the supplied image and design-reference.md; record intentional
  substitutions and verify no fake streaks/category charts/timestamps/notes appear.
- SC-001–007: quickstart manual timing, 100-task update timing, before/after saved-record
  comparisons, browser reload, blocked/failed network requests, retry and conflict scenarios.

## Complexity Tracking

No violations requiring exceptions. The service/store boundary exists to enforce transactional
lifecycle rules and test disk failures without coupling them to UI rendering.

## Latest-reference calendar addition and gate

Implement a small MonthlyScoreCalendar.tsx in the lower-left split region; sidebar Calendar
focuses it. Derive monthly records via GET /api/months/:month from existing saved day values,
not a second authoritative score table. Aggregate reads are bounded to the displayed month.
The new Insights panel is a labeled future slot, with no analysis/chart dependency.

Use a shared pure classifier in src/domain/score-colors.ts and semantic CSS tokens for all
score displays. Follow contracts/score-colors.md, not screenshot thresholds. Existing calculation
is unchanged. Resolve calendar historical eligibility/future-date presentation separately before
dependent calendar work; color-function and ring integration can proceed independently.
