# Quickstart Validation: Today's Plan Column Sorting

Implementation validation guide; actual results are in [validation.md](validation.md). Follow [model](data-model.md) and
[UI contract](contracts/plan-table-sorting.md). Use Node 24 and existing installed project dependencies.
No Python/source service setup is needed for sorting itself; source-related browser tests use mocks.

## Commands after implementation

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Browser fixtures must retain dedicated backend port 5237, source mock 5236 and owned temporary
storage/proxy overrides. Never run default scenarios against the actual dashboard 3001 or personal
Things service 5225. This feature needs no saved-data migration, live Things reads or source changes.

## Controlled ordering fixture

Seed at least twelve tasks in deliberately mixed original order, covering all four weight labels,
both completion states, equal titles, accent/case ties, Task 2/Task 10 and different category names.
Record original IDs/order, categories, weights, completion, revision and scoring output.

1. Start with no active indicator and original order. Activate Task: A–Z, then Z–A. Confirm natural
   numeric ordering and stable equal-title/case/accent ties. Category names do not change title order.
2. Activate Weight: XL/L/M/S, then S/M/L/XL. Tied weights retain original ranks, including in reverse.
3. Activate Status: incomplete/completed, then completed/incomplete. Tied statuses retain original
   ranks. Switching columns always starts that column's documented first direction.
4. Reset sort: exact original order returns, active state clears and focus returns to its header.
   Confirm no PUT/transition/sync request, source read, revision or score change for steps 1–4.
5. Repeat on a finalized day and verify its saved record/category/score/calendar state stays identical.
6. Sort empty and single-task plans and reset without errors. For 100 tasks, measure visible ordered
   output within one second from each activation, rather than helper computation time alone.

## Editing, completion and async acceptance

1. Under Status sort, focus and check a named task. Verify that same task moves to its new sorted
   position, retains focus/category and saves completion once with unchanged underlying array order.
2. Enter Edit Plan from a sorted view: header/reset controls pause with a visible/accessible reason.
   Rename, reweight, check, add and remove rows. Existing row ranks do not change until Done, new IDs
   append and deleted IDs disappear. On Done, including blur of a just-edited title, apply the latest
   selected sort. Inspect saved array order separately from visible order after normal autosave.
3. Navigate while drafts/save are pending; confirm each day's drafts remain and no prior-day edit
   capture leaks into another day. Sort selection survives an unloaded date's loading/unmount and
   cached-date navigation. Page reload resets only sort selection to original order.
4. Run an explicit mock Things Sync while sorted. Accepted title/weight/completion/category updates
   and new tasks appear in selected order without extra source reads, duplicate tasks or focus theft.
   Simulate source failure, save conflict and lost-response receipt recovery; keep error feedback and
   draft/category/revision safeguards intact. Sorting cannot turn recovery into a fresh source sync.
5. Finalize while in edit mode: finalized view becomes sortable without a frozen edit snapshot.
   Temporarily block controls during an in-flight mock sync without discarding an editing capture.

## Keyboard and rendered review

At 375px, 800px and 1440px verify the Task label, Weight/Status icons with hover text, inline active-only direction arrow, reset
and Edit Plan/Done actions fit with no overflow or overlap. Use long title/category fixtures and
retain compact task rows. Capture artifacts/task-sorting/ views and inspect them.

Use keyboard alone to activate both directions of all three headers and reset with Enter/Space.
Verify visible focus, header aria-sort and status announcements without changing established task
control names or source-authority descriptions. Confirm editing pause is explained without hovering.
Do not assume ARIA attributes alone establish screen-reader support; record actual inspected/tested
semantics and any untested assistive-technology combinations during implementation validation.

## Verified behavior

Date/lifecycle keys end local Edit Plan on navigation/finalization while preserving cached drafts
and App's selected sort. No API, source adapter, schema, dependencies or browser persistence were
added. Tests use dedicated mock source/backend and temporary databases. See validation.md for
exact counts, focus/ordering evidence and rendered review; application changes remain uncommitted.
