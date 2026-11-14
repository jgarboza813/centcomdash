# Data Model: Today's Plan Column Sorting

All entities below are transient client view state. Existing Task/Plan, save requests, receipts,
source snapshots, SQLite schema and scoring models remain unchanged.

## Sort selection

`SortSelection = {column: 'task' | 'weight' | 'status', direction: 'ascending' | 'descending'} | null`.
Null means underlying/saved-order mode. App owns it for the open page's lifetime; it is not keyed to
a day and is not written to browser storage. Navigating dates retains it; a full reload starts null.

| Current selection | Action | Next selection |
| --- | --- | --- |
| Any other column or null | Task | task/ascending |
| Any other column or null | Weight | weight/descending |
| Any other column or null | Status | status/ascending |
| Same column/ascending | Same column | Same column/descending |
| Same column/descending | Same column | Same column/ascending |
| Active sort | Reset sort | null |
| Editing | Any header or reset | No change; control disabled |

## Displayed task order

A new array/view of existing Task references, never an input mutation. Underlying order is the
current original tasks prop (including pending drafts/new additions), not an older acknowledged
snapshot that could discard edits. Saved order is unchanged by the act of sorting.

| Column | Ascending primary comparison | Descending primary comparison |
| --- | --- | --- |
| Task | English natural A–Z, case/accent-insensitive | Reverse primary title comparison |
| Weight | S, M, L, XL by explicit label rank | XL, L, M, S |
| Status | incomplete, completed | completed, incomplete |

Decorate each task with its original array index. Direction applies only to the primary comparison;
equal primary values always compare by increasing original index. Never reverse an already-sorted
array. Category label, source link ID, task UUID and color are not secondary sort keys.

No helper changes a Task object, category, assigned weight or completion. Empty/one-item arrays
remain valid. Sorting title text uses its stored current value; punctuation/emoji are not stripped
or rendered as markup. Existing schema guarantees valid labels and completion booleans.

## Editing order snapshot

`{date: YYYY-MM-DD, taskIds: string[]}` scoped to the currently mounted table's edit session.
IDs are unique and drawn from the current displayed tasks when Edit Plan begins.

- Enter edit: capture displayed identity order and disable sorting/reset with an explanation.
- Existing task values change: resolve current objects in captured identity order, preserving ranks.
- Remove task: omit its ID from capture/display; write removal against original tasks.
- Add/import task while effective editing: append newly encountered IDs in underlying array order
  and retain their editing rank. Additions in the normal non-edit view follow the active sort.
- Done: discard capture and derive current active sort. Blur-committed title changes must be included.
- Date changes: date-keyed table remount ends local editing/capture; drafts stay in useDailyPlan's
  existing per-date cache and selection stays in App. Capture again on the next Edit Plan activation.
- Finalization: end effective edit capture, allow sorting on the finalized view. A temporary sync
  control block is not finalization and does not itself clear capture/drafts.

The capture is not saved as the task array. Every action uses original ID-based map/filter/append;
server acknowledgment order follows the existing original array, regardless of visible edit order.

## Focus origin (only if browser verification requires it)

A short-lived reference to the checkbox activated for a particular task/date can restore its focus
if moving that keyed row loses focus. Restore only after its own completion event and only while
same-day/same-control focus intent is still valid. Never focus a row after unrelated sync, date
navigation or an explicit user focus change. No persisted focus or sorted row indices.
