# Quickstart Validation: Things Project Categories

Implementation validation guide. Actual results and fixture/live distinctions are in [validation.md](validation.md).
Use Node 24 and the existing isolated Python 3.12 environment/pinned dependencies. Follow
[category-sync](contracts/category-sync.md), [UI](contracts/task-category-ui.md) and [model](data-model.md).

## Compatibility gate

Extend the owned synthetic database in tools/things-api/verify_reader.py with direct project,
heading-contained project, no project, area-only, same-name projects, dangling parent, blank title,
completed-today and completed-yesterday cases. Verify explicit object/null output, bounded relationship
reads and failure on dangling/incomplete data. No personal Things tasks need to be changed.

```sh
tools/things-api/.venv/bin/python tools/things-api/verify_reader.py
```

After implementation, restart the repository launcher separately to advertise category capability:

```sh
tools/things-api/.venv/bin/python tools/things-api/serve.py
```

An old launcher without X-Centcom-Categories: 1 must produce an actionable incompatible-reader error,
not clear saved categories. Never print bearer tokens or put them in browser config. Ctrl+C stops the
service. Open Things regularly for recurring occurrences; existing Today prediction limitations apply.

## Automated checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Default tests use injected/synthetic source data. Keep the Playwright backend on dedicated port 5237
with its temporary database and Vite proxy override; it must not reach the actual dashboard on 3001.
Back up the stopped real dashboard database before any upgrade/real-data walkthrough. No DDL migration
or history rewrite is planned. Add tests before behavior changes and observe meaningful failures first.

## Acceptance scenarios

1. Seed ten tasks across three projects plus no-project, including Today, This Evening and eligible
   completed-today tasks. Explicit sync imports correct category snapshots and completion/weights.
2. Move and rename projects; ten repeated syncs retain identity/weight, update category-only counts
   once per changed task, and create no duplicates. Same-name projects remain distinct by identity.
3. Confirm no-project clears a prior category; dangling/unreadable parents fail the entire sync.
   Missing/canceled/trashed unresolved sources preserve their last saved category.
4. Rename/reweight/check a saved task, reload and verify category preservation. Forged category in
   ordinary PUT is rejected. Manual and pre-feature tasks display Uncategorized without backfill.
5. Finalize a day, alter source project fixtures, browse/reload it and compare exact saved labels,
   score and calendar shading. No source read occurs; past/future sync remains rejected.
6. Lose a response then recover its receipt; verify no new category reads. Replay an older receipt
   after a newer acknowledged revision and verify it cannot erase newer category context/drafts.
7. Inspect task labels at 375px, 800px and 1440px with an 80-character project name, unbroken tokens,
   emoji and markup-like names. Verify beneath-title blue styling, no visible Things label, no overlap,
   and accessible linked checkbox descriptions without changed control names. Capture rendered views.
8. Inject bad capability, malformed pairs, authentication, source-read and persistence failures;
   compare plan/category/links/state/receipt and last-success time before/after. No partial success.

## Optional live walkthrough

Only after synthetic/default suites pass, run an explicit read-only diagnostic with the real source
and an owned temporary dashboard database. Record sanitized counts/shapes and pinned source versions;
do not print personal titles/IDs or mutate Things. Do not infer source compatibility from fixtures.
Live user-dashboard imports happen through the user's explicit Sync with Things action. Record actual
validation results during implementation, including any missing live heading cases or limitations.

## Analysis remediation A1 — unresolved-task precedence

Canceled or trashed source tasks are classified as unresolved before project resolution. Emit no
project category for those outcomes; the dashboard preserves their saved category and does not
attempt to clear it. Missing tasks retain the existing explicit missing outcome. Required category
object/null validation and project-resolution failures apply to readable active/completed tasks
only. An absent category on an active/completed task remains incompatible and fails the operation.
A dangling project on a canceled/trashed task must not fail other valid updates in the same sync.

## Recorded implementation notes

Category-specific browser scenarios live in tests/e2e/task-categories.spec.ts; existing sync
regressions remain in things-sync.spec.ts. Python synthetic checks, unit/API tests and the default
browser suite use owned fixtures only. The opt-in check-sync.ts prints category/project counts
without personal task/project names or IDs and writes only its temporary dashboard database.
There is no SQL migration. Back up before upgrades/rollback; older application binaries may
discard additive metadata if used to write new-format tasks.
