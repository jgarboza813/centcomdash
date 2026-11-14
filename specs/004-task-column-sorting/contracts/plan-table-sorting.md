# Plan Table Sorting UI Contract

## State and ownership

App passes PlanTable its current date, original tasks, page-lifetime sort descriptor and a pure
selection callback. Existing change(tasks) remains the sole task-edit callback; header/reset handlers
must never call it or useDailyPlan edit/flush/sync. Do not serialize sort state in existing requests.
Sorting accepted task props must not modify the objects or trigger source access.

No API, schema, Things adapter or persistence-contract changes. Existing revision checks, receipt-only
recovery, retained categories, weights, finalized history and autosave semantics remain authoritative.

## Header interaction

Each Task/Weight/Status columnheader contains a native button with stable accessible name:
“Sort by Task”, “Sort by Weight”, “Sort by Status”. Enter, Space, pointer and touch share the same
handler. First direction: Task ascending, Weight descending, Status ascending. Repeat toggles;
changing column restores the new column's first direction. No multi-column state.

Use native table markup or coherent role=table/rowgroup/row/columnheader/cell semantics around
existing grid header/data rows; the selected implementation is the role-based adaptation. Controls
remain native buttons/inputs, without adding a grid widget or arrow-key interaction requirements.
Set aria-sort=ascending/descending on the active columnheader only; remove it from inactive headers.
Provide an associated description of sorting and a status announcement after user sort/reset changes.
Do not announce on every task-prop update. Keep checkbox/source-authority and editing names intact.

Only the actively sorted header shows a directional arrow. Unsorted headers show no sort
indicator. Keep the arrow inline on the same row as Task text or the Weight/Status icon.
Weight uses a weight icon and Status uses a checked-circle icon; their text appears in hover
titles (Weight/Status) and their stable accessible names remain Sort by Weight/Sort by Status.
Decorative SVGs are hidden from assistive technology. Use 16px column icons, a 10px inline
arrow and a 2px gap within narrow icon-only cells. Task retains its visible label. Header
buttons cover their cell width, retain visible hover/focus, and never wrap the indicator to
a second line or widen the table. Active color is supplementary to the arrow direction.

Reset sort is visible when sorting is active, beside Edit Plan/Done in a wrapping action group.
It restores underlying order and clears the descriptor. Because the reset control then disappears,
return focus to the previously active header. Do not move focus when merely receiving new props.

## Editing and eligibility

Header/reset controls are disabled during effective Edit Plan and share the explanation
“Sorting is paused while editing. Select Done to apply your sort.” The explanation is visible
while editing and connected through accessible descriptions. Do not rely on tooltips on disabled
buttons alone. Maintain the current active indicator while paused.

Capture current displayed IDs when edit begins, scoped by date. Keep fields/rows stationary through
rename/reweight/check, append new identities and drop removed identities. On Done discard capture
and sort latest underlying values, including title committed by blur from the same interaction.
All modifications use the original tasks array. A date-keyed table remount ends local editing on navigation without erasing cached drafts; the
next Edit Plan activation captures the newly viewed day.
Finalization releases effective editing/capture, so the finalized table remains sortable.

Loaded finalized/historical/empty/one-task views allow sorting. Loading and load-error panels do not
expose stale table headers. Existing failed save/sync feedback stays available and drafts/recovery
state stay intact. Sync alone can block mutation controls without blocking display-only view sorting;
an effective edit session still pauses sorting through such a temporary block.

## Updated task props and focus

View-mode completion and accepted sync results are re-sorted from current original tasks. Keep
React row keys by local task.id. The activated checkbox retains focus when Status moves its row;
if needed use guarded event-specific restoration, not a global sort/sync focus effect. Sorting an
old receipt must never bypass existing acknowledgment protections or revive outdated data.

## Responsive acceptance and invariants

At 375px, 800px and 1440px preserve compact rows, fixed 32px weight badges, wrapping project text,
visible Task label and Weight/Status icons with hover text and control focus outlines. Reset/edit action group may wrap above
the table; no extra data column or horizontally scrolling task table is introduced. Direction arrows stay inline; task row density remains unchanged.

For sorting/reset alone, compare original order/IDs/categories/weights/completion, saved day revision,
score/calendar output and network activity before/after: they must be identical, with zero plan
mutation requests or Things reads. Ordinary edits and explicit sync retain their existing requests.
For six sort orders and reset, tied values retain original order; do not reverse tied groups.
