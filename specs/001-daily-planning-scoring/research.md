# Research: Daily Planning and Scoring

**Date**: 2026-10-31 | **Status**: Core technical decisions resolved; shared score colors confirmed; calendar eligibility remains open

## 1. Interface and project shape

**Decision**: React + strict TypeScript + Vite, one npm package, native controls and CSS.
**Rationale**: A single interactive daily page needs no server rendering or route framework.
Vite supplies the dev/build tooling; the domain remains framework-independent.
**Alternatives considered**: Next.js/React Router framework add unused routing/rendering
capabilities here; a monorepo adds coordination overhead; a component library is unnecessary
for the small initial control set. React generally recommends frameworks; this bounded local
SPA intentionally uses its documented from-scratch path.

Sources: [React app creation](https://react.dev/learn/creating-a-react-app),
[Vite guide](https://vite.dev/guide/).

## 2. Authoritative storage

**Decision**: A loopback-only Express 5 server with SQLite via better-sqlite3.
**Rationale**: Daily historical records belong in a persistent file independent of browser
origin/profile. SQLite transactions support all-or-nothing snapshot/lifecycle saves. One local
server and file are sufficient. Start with default rollback journaling and synchronous FULL;
short transactions and modest data avoid a need for WAL tuning.
**Alternatives considered**: localStorage lacks transactional data management; IndexedDB is
asynchronous and transactional but browser storage remains subject to clearing and eviction.
It would require accepting profile-bound historical records. A hosted database introduces
accounts, networking, and deployment outside this slice. Native SQLite bindings add an install
constraint; choose a release supporting Node 24/macOS arm64 and verify it during setup.

Sources: [SQLite transactional guarantees](https://sqlite.org/transactional.html),
[transaction behavior](https://sqlite.org/lang_transaction.html),
[better-sqlite3](https://github.com/WiseLibs/better-sqlite3),
[Express 5](https://expressjs.com/en/5x/api/),
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API),
[browser eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## 3. Scoring and preserving history

**Decision**: Integer percentage-point weights preserved per task, a fixed `fixed-budget-v1`
score rule per plan, pure shared calculations, explicit persisted lifecycle transitions.
**Rationale**: User confirmed 80 completed points scores 80% regardless of planned allocation.
Completed 96 scores 96%; 120 scores 120%; an empty plan has no numeric score. Preserved values
prevent future defaults from changing history. Day records are whole-day aggregates; this
makes finalization atomic without a complex event-sourcing system.
**Alternatives considered**: Normalized scoring conflicts with the user's answer; recomputing
weights from current defaults would violate historical accuracy; automatic midnight freeze
conflicts with explicit finalization.

## 4. Saves, retries, and conflicting tabs

**Decision**: Debounced snapshot saves with one request in flight per day, server-side revision
checks, and persisted request IDs/receipts in the same transaction. Finalize first flushes edits,
then atomically changes lifecycle; reopen is a separate explicit operation.
**Rationale**: A lost response must not duplicate a task or create ambiguous transition state.
An exact request replay returns its original acknowledgement. Stale writes fail visibly rather
than overwriting another tab. No automatic merge of a conflicting historical record.
**Alternatives considered**: Blind last-write-wins can erase history; retrying unkeyed task
creation can duplicate entries; a distributed synchronization engine is unjustified.

## 5. Runtime and verification

**Decision**: Node 24 LTS target; Vitest for domain/service integration and Playwright for
end-to-end browser flows. Pin concrete compatible dependency versions at implementation.
**Rationale**: The current Node 16 runtime is obsolete for the selected tooling. The test
split checks mathematical rules, disk transaction behavior, and real UI outcomes independently.
**Alternatives considered**: Retaining Node 16 would require older dependencies; UI snapshots
alone cannot prove persistence or retry behavior. No benchmark suite beyond specified timing.

Sources: [Node releases](https://nodejs.org/en/about/previous-releases),
[Vitest guide](https://vitest.dev/guide/),
[Playwright local web server](https://playwright.dev/docs/test-webserver).

## Boundaries and limitations

The service runs locally; public hosting/authentication, Things access, cross-device sync,
and backup UI are deferred. A database file can still be lost if the disk is lost: stop the
server before copying the file for backup. Browser input not yet acknowledged as saved can
be lost on browser termination; preserve it during in-session retries and warn before leaving
with unsaved edits. No deployment or runtime upgrade has been executed by this planning step.

## 6. Reference-driven dashboard composition

**Decision**: Adopt the supplied image's shell, card/table hierarchy and panel arrangement;
use CSS grid and inline SVG rings rather than a chart dependency. Retain native checkbox
semantics beneath circular status styling. Default to table view with explicit inline edit mode.
**Rationale**: The earlier UI contract described operations but omitted the intended daily
experience. Jose confirmed that visual fidelity comes now, additional feature behavior later.
**Alternatives considered**: Implementing all pictured capabilities would expand the agreed
slice. Omitting their panels would lose the requested composition. Static fake values/charts
would misrepresent product behavior. Use explicit future-feature placeholders instead.

The fixed-budget rule remains authoritative: 60 points displays 60%, not the pictured 62%.
See [design-reference.md](design-reference.md) for the image's inconsistent arithmetic and
follow-up definitions. This decision changes presentation, not storage or API behavior.

## 7. Replacement square reference and score calendar

**Decision**: Replace portrait composition with the latest square layout. Place Timeline and
monthly score calendar beneath Plan; stack Progress, Category, horizontal Guide, Notes and
new upcoming Insights to the right. Read calendar scores from existing records; use native
month/date controls and CSS grid without a chart package.
**Rationale**: Jose explicitly requested the new calendar showing historical scoring by color.
**Alternatives considered**: Treating the calendar as a disabled placeholder would omit the new
request; copying its sample thresholds would preempt Jose's requested scoring-rule review.
**Updated decision**: shared colors, above-100 and neutral zero styling are confirmed in
contracts/score-colors.md. Only calendar lifecycle eligibility/future-date presentation remain open.
Earlier “technical decisions resolved” statements apply to the original daily slice, not this
new classification addition. No current scoring formula is changed by this visual revision.

## 8. Shared daily score colors (confirmed)

Use one classifier across all completion-score displays, not just calendar cells. Jose confirmed
the non-overlapping intervals in contracts/score-colors.md. Zero overrides the red band and uses
neutral No data styling; numeric zero remains preserved. The score formula is unchanged. Replace
fixed green rings and the screenshot legend; allocation blue and task weight badges are separate.
