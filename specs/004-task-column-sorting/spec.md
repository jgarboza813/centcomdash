# Feature Specification: Today's Plan Column Sorting

**Feature Branch**: `main` (no feature branch created)

**Created**: 2026-11-14

**Status**: Implemented and validated (see validation.md)

**Input**: Make the Today's Plan table sortable by column.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organize the Plan by a Column (Priority: P1)

Jose selects Task, Weight or Status to organize his commitments for review without changing the plan itself.

**Why this priority**: Alphabetical, weight and completion views help find tasks and prioritize remaining commitments.

**Independent Test**: Load mixed task titles, all four weights and both completion states; activate each header and verify both directions and the active indicator.

**Acceptance Scenarios**:

1. **Given** the plan initially uses its saved order, **When** Jose activates Task, **Then** rows display by title A–Z and Task shows the active ascending direction; activating it again shows Z–A.
2. **Given** no Weight sort is active, **When** Jose activates Weight, **Then** rows display XL, L, M, S; activating it again displays S, M, L, XL.
3. **Given** no Status sort is active, **When** Jose activates Status, **Then** incomplete tasks appear before completed tasks; activating it again puts completed tasks first.
4. **Given** one column is active, **When** Jose selects another, **Then** the new column uses its first-activation direction and is the only active sort.
5. **Given** rows share the same sort value, **When** either direction is selected, **Then** tied rows retain their relative saved order.
6. **Given** sorting is active, **When** Jose activates a visible Reset sort action, **Then** the table returns to saved order and no column is marked active.

---

### User Story 2 - Keep Sorting Safe During Daily Work (Priority: P2)

Jose checks tasks, edits commitments and syncs Things while preserving task identities, scores and saved history.

**Why this priority**: A presentation preference must not reorder stored commitments, lose drafts or cause source access.

**Independent Test**: Sort a plan, toggle completion, edit and sync using controlled fixtures; compare saved task identities/order/metadata and scores before and after presentation-only sorting.

**Acceptance Scenarios**:

1. **Given** a sort is active, **When** Jose changes its column/direction or resets it, **Then** the saved plan, revision, save status, points and calendar score remain unchanged, and no save or Things read occurs.
2. **Given** Status sorting is active in view mode, **When** Jose checks a task, **Then** normal completion saving occurs and that same task moves to its sorted position while retaining keyboard focus and category.
3. **Given** a sorted plan, **When** Jose enters Edit Plan, **Then** the visible row order stays fixed while editing; sortable headers and reset are disabled with an explanation until Done.
4. **Given** Edit Plan is active, **When** Jose renames/reweights/adds/removes tasks, **Then** existing rows do not jump, new rows append to the displayed editing order, and removed rows disappear. On Done, the selected sort is reapplied to current values.
5. **Given** an active sort, **When** an explicit Things Sync succeeds, **Then** updated and newly imported tasks appear in the selected order, with no additional sync or duplicate tasks caused by sorting.
6. **Given** a failed save/sync, **When** the error is shown, **Then** sorting does not discard drafts, categories, recovery context or error feedback.
7. **Given** a finalized or historical day, **When** Jose sorts it, **Then** sorting is available without reopening or changing the saved day.

---

### User Story 3 - Sort Accessibly Across Screen Sizes (Priority: P3)

Jose can discover and operate sorting by mouse, touch or keyboard at desktop, tablet and mobile widths.

**Why this priority**: Sorting should remain clear in the compact table and usable without relying on color or pointer input.

**Independent Test**: At 375px, 800px and 1440px, operate each header and reset with keyboard and pointer input; inspect visible and assistive sort state.

**Acceptance Scenarios**:

1. **Given** the table is visible, **When** Jose tabs to a sortable header and presses Enter or Space, **Then** the same sorting behavior occurs as pointer activation and focus remains visible.
2. **Given** an active sort, **When** Jose reviews the headers, **Then** its column and direction are visible through an indicator and available to assistive technology; inactive headers remain identifiable as sortable.
3. **Given** a narrow viewport and long titles/categories, **When** Jose sorts, **Then** the Task column retains its available space, text wraps naturally, and sort controls do not create overflow or cover task controls.
4. **Given** a sort is active, **When** Jose changes the viewed day, **Then** the same column/direction applies to that day's tasks; reloading the page starts in saved order.

### Edge Cases

- Empty and one-task plans remain usable; sorting produces no errors or data changes.
- Equal titles, case-only differences, equal weights and equal status preserve saved-order ties in both directions; changing direction must not reverse tied groups.
- Task titles containing numbers use natural ordering (Task 2 before Task 10 in A–Z); case and accents do not create separate primary sort groups. Emoji/punctuation remain literal display text.
- The Task column sorts by title, not the secondary category label. There is no separate Category or Points column in this increment.
- Completion changes under Task/Weight sorting do not reorder rows except where their selected sort value changes.
- Sorting and editing operate by task identity, never the displayed row number; a checkbox or removal always acts on the intended task.
- Recovered sync receipts obey existing revision/draft protections before their contents are sorted.
- Edits must preserve the underlying saved task order even when the visible table was sorted before entering Edit Plan; sorting is not a manual reorder operation.
- Source selection, the compact layout, fixed-width weight badges and the Finalize/Reopen workflow retain their existing behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Task, Weight and Status headers MUST each provide an operable single-column sort control. Sorting MUST be available on editable, finalized and historical days once that day has loaded successfully.
- **FR-002**: First activation of Task MUST sort titles A–Z using English natural, case/accent-insensitive ordering; the next activation MUST use Z–A. Category text MUST not affect title comparison.
- **FR-003**: First activation of Weight MUST sort XL → L → M → S, and the next MUST reverse that order. Sort by weight meaning, not alphabetic labels or color.
- **FR-004**: First activation of Status MUST place incomplete tasks before completed tasks; the next MUST place completed tasks first.
- **FR-005**: Only one column MUST be active at a time. Changing columns MUST use that column's first-activation direction; repeated activations of the same column MUST alternate its two directions.
- **FR-006**: Equal sort values MUST retain their relative underlying saved order in either direction. Reset sort MUST restore the current underlying saved order and clear the active indicator.
- **FR-007**: Sorting MUST affect display order only. It MUST NOT save/revise a day, reorder the stored task array, change identities/weights/categories/completion/scores, modify Things or initiate any source reads.
- **FR-008**: Active sorting MUST reapply after ordinary view-mode completion changes and accepted sync results. The sort choice MUST persist across day navigation within the open page and reset to saved order on page reload; no cross-session preference is required.
- **FR-009**: Entering Edit Plan MUST freeze the current displayed order and disable column/reset sorting with an accessible explanation. Existing editing rows MUST stay in place, newly added rows MUST append, and removed rows MUST disappear. Done MUST reapply the chosen sort. Saved edits MUST preserve underlying task order independently of the frozen display order.
- **FR-010**: All task actions MUST target stable task identity despite display reordering. Sorting MUST preserve draft/error/recovery context and prevent focus from being lost when a checked task changes position.
- **FR-011**: Sort controls MUST support pointer, touch, Enter and Space, provide visible focus, and expose active column/direction to assistive technology. Visible direction indicators MUST not rely on color alone. Existing task control accessible names MUST remain intact.
- **FR-012**: At 375px, 800px and 1440px, headers and sort/reset controls MUST fit without horizontal page overflow or overlap. Task retains its visible text; Weight and Status use icons with hover text and accessible names. Only the sorted column shows a direction arrow, inline with its label/icon. Preserve the compact Task/Weight/Status layout and wrapping title/category hierarchy.
- **FR-013**: Loading/error views MUST not offer sorting against an unloaded day. Empty and one-task loaded days MUST accept sorting without exceptions; current save/sync failures MUST remain visible and recoverable independently of sort choice.

### Key Entities *(include if feature involves data)*

- **Sort selection**: The selected column (Task/Weight/Status) and its direction, or saved-order mode. Applies to the open dashboard view and does not belong to a saved day.
- **Displayed task order**: An ordered view of existing task identities derived from sort selection and the day's underlying task order.
- **Editing order snapshot**: The displayed identity order captured on entering Edit Plan, retained while editing and discarded on Done. It is separate from saved task order and is scoped to the viewed day. Date navigation or finalization ends that local edit session; pending per-day drafts and the selected sort remain available.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A controlled plan containing at least twelve tasks, all four weights, mixed completion, duplicate titles and numbered titles produces the expected order for all six column/direction combinations and saved-order reset.
- **SC-002**: Sorting/resetting alone causes zero saves, Things reads or saved-day changes; exact underlying identities/order/categories/weights and scoring outputs match before and after the complete sort sequence, including a finalized fixture day.
- **SC-003**: Each sort of a 100-task plan is visibly reflected within one second of activation under normal local use.
- **SC-004**: All column directions and reset are operable using keyboard alone, and active column/direction can be determined without color at 375px, 800px and 1440px with no horizontal overflow.
- **SC-005**: In combined edit/check/sync/recovery scenarios, every action affects the intended task, draft/category data is preserved, tied rows remain stable, and editing rows never jump until Done.

## Assumptions

- Current columns are Task, Weight and Status. Category sorting, multi-column sorting, drag-to-reorder, filtering and a restored Points column are outside this increment.
- Proposed defaults are title A–Z, highest weight first, and incomplete first. Reload starts in saved order; a visible Reset sort action provides a way back during the session.
- Sorting is a temporary view preference shared across viewed dates in the current page, rather than a preference saved with a particular day.
- Freezing rows during Edit Plan avoids moving the field being edited. Column sorting resumes on Done; ordinary view-mode completion may move rows immediately under Status sorting.
- Existing commitment/scoring/history rules and Things Sync behavior remain the source of truth; this increment depends on those capabilities without changing their semantics.
