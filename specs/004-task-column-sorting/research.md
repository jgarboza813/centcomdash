# Research: Today's Plan Column Sorting

Research date: 2026-11-14. Read-only inspection of repository source and primary documentation;
no application implementation, network operation against personal services or saved-data change.

## Sort only the displayed copy

**Decision**: Add src/client/task-sorting.ts with a pure copied-array helper consuming the existing
Task type, a sort descriptor and underlying indices. Use an English numeric collator with base
sensitivity for Task; explicit S/M/L/XL ranks for Weight; boolean completion for Status.
Multiply only the primary comparison by direction. For ties always use original index ascending.

**Rationale/evidence**: PlanTable currently maps tasks directly for both render and change operations.
In-place sort or feeding displayed rows to change would persist a presentation order on the next edit.
Stable indices make reverse sorting keep tied groups intact instead of reversing the whole result.
The browser's existing string comparison facility avoids new dependencies. [Intl.Collator documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator)
explains language-sensitive comparison; use explicit 'en', numeric=true and sensitivity=base so host
locale does not silently choose the title-ordering policy.

**Alternatives considered**: In-place sort (mutates saved/draft order); reverse an ascending array
(reverses ties); locale-default lexical comparison (wrong numeric/case behavior); table library
(no requirement justifies it).

## Keep sort selection above the table's lifetime

**Decision**: App owns null-or-column/direction selection. PlanTable receives it alongside date and
retains only its transient local editing capture. No persisted setting or backend changes.

**Evidence**: App conditionally renders loading/error panels in place of PlanTable. Local sort state
inside PlanTable would be lost when navigating to an unloaded day. useDailyPlan already caches drafts
and acknowledgments per date and controls autosave/explicit sync; sorting should not enter that path.

**Alternatives considered**: PlanTable-only sort state (fails navigation requirement); store sort on a
day (writes historical records); localStorage (cross-session behavior outside the approved scope).

## Freeze editing by identity and date

**Decision**: Capture ordered IDs on Edit Plan. Resolve current tasks from those IDs, remove deleted
IDs and append newly observed IDs; update the capture without changing existing ranks. Keep all
patch/remove/add callbacks based on the underlying tasks array. End capture on Done or effective
finalization. Initialize a new capture on a date change if local edit mode survives; otherwise create
it on the next Edit Plan activation. No assumption that React keeps the table mounted during loading.

**Evidence**: Current task actions already use IDs and original map/filter/append operations. The title
input remounts on a changed title and commits on blur, so changing row order during editing would
compound an existing focus transition. Source sync can temporarily set disabled without meaning
editing should be discarded. Spec's conditional editing-across-date clause permits local mode to end
when loading unmounts the table, while stored per-date drafts must remain intact.

**Alternatives considered**: Freeze task objects (stale values); freeze indices (wrong task after
removal); freeze sorted tasks and save them (reorders underlying commitments); re-capture each render
(rows jump after a changed sort value).

## Table semantics with real header buttons

**Decision**: Introduce a coherent ARIA table structure around current grid header/data rows, with
columnheader aria-sort only on the active column. Use native header buttons for Enter/Space and an
inline direction arrow only on the active column. Keep reset in the panel action group.

**Rationale/evidence**: Existing .task-head and .task-row are plain divs without table semantics.
[W3C sortable-table guidance](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
places sort state on the header and uses buttons for activation. The project keeps its CSS grid layout;
adding coherent table roles avoids introducing a grid's arrow-key interaction model or a new package.
This adaptation requires rendered/accessibility review rather than assuming ARIA markup alone proves
support. Mobile currently reserves just 43px for Weight and 28px for Status; inline label+arrow would
likely overflow. Use icon-only Weight/Status headers with hover titles and accessible names, placing the active arrow inline, and remove generic button padding within headers.

**Alternatives considered**: aria-sort on buttons (wrong semantic location); tooltips/color only
(not enough state feedback); role=grid with custom arrow navigation (unnecessary complexity);
new semantic HTML table layout (viable, but a broader layout rewrite than the existing CSS grid needs).

## Checkbox focus and sort eligibility

**Decision**: Retain row keys by ID and verify focused checkbox movement in browser tests. If needed,
use narrowly scoped event-origin focus restoration with same-day/same-control guards, never general
focus-on-sort. Sorting eligibility is separate from edit eligibility: finalized views remain sortable,
while an active edit capture pauses headers/reset. Source operations alone do not disable view sorting.

**Evidence**: Current disabled combines finalization, load and sync state; reusing it would incorrectly
block finalized sorting. Existing rows are correctly keyed by task.id. Actual focus behavior after DOM
movement must be tested rather than inferred from keys alone. Do not add new save/recovery effects.

## Resolution

All planning unknowns have decisions. A required research-agent review independently confirmed state
ownership, original-array writes, narrow header widths, semantic sort state and focus risks. Existing
API/source protections remain unchanged; no new integration verification or dependency choice needed.

## User-reviewed header presentation update

The user replaced the initial two-line proposal with inline, active-only direction arrows.
Weight and Status are now 16px icons with hover titles and unchanged accessible names.
A 10px arrow and 2px icon gap fit the narrowest 28px Status cell. Task retains visible text.
This supersedes the initial neutral-icon/second-line design without changing sort behavior.
