# Feature Specification: Daily Planning and Scoring

**Feature Branch**: `main` (no feature branch created; feature directory is independent)

**Created**: 2026-10-31

**Status**: Design updated — shared score colors confirmed; calendar lifecycle eligibility still to clarify

**Input**: User-approved scope: add tasks to a day, assign XL/L/M/S weights, show planned
allocation and remaining capacity, mark tasks complete, calculate the daily score, and save
the day for later review. Follow the Central Command constitution v1.0.0.

## Clarifications

### Session 2026-10-31

- Q: How is the daily score calculated? → A: Completed weight out of the fixed 100-point
  daily budget (option A), without dividing by planned allocation.
- Q: When does a day become historical? → A: Only when explicitly finalized; further edits
  require an explicit reopen action (option B).

- Q: Which colors represent daily completion scores across the app? → A: >=95 bright green;
  >=85–<95 green; >=65–<85 yellow; >=45–<65 orange; >0–<45 red; 0 No data. Calculation unchanged.

## Visual Reference and Scope

The dark dashboard image supplied by Jose is the visual reference. The daily page MUST follow
its sidebar, personalized header, four summary cards, large plan table, right-hand panels,
right-column Notes/Insights, and the split lower-left Timeline/monthly-score-calendar region
of the latest square reference, replacing the earlier portrait composition. See [design-reference.md](design-reference.md)
and [UI contract](contracts/daily-dashboard.md) for the reconciled behavior.

Jose confirmed on 2026-10-31: match the layout now; add extra capabilities in follow-up specs.
Streaks, categories, timeline, notes, Insights, and Things sync therefore occupy clearly labeled future
feature slots, without invented values or active controls. Existing fixed-budget scoring and
explicit finalization remain authoritative over the image's contradictory examples.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan a Day's Commitment (Priority: P1)

As Jose, I want to enter today's tasks and choose their commitment weights so I can see how
much of my daily capacity I have allocated before executing the plan.

**Why this priority**: Planning and allocation replace the first essential spreadsheet workflow.

**Independent Test**: Start with an empty day, add nine named tasks with assigned weights,
and verify the allocation without requiring completion tracking or historical reporting.

**Acceptance Scenarios**:

1. **Given** an empty day, **When** I open it, **Then** I see the date, no tasks, 0% planned
   allocation, 100% remaining capacity, and an action to add a task.
2. **Given** an empty day, **When** I add 3 XL, 2 L, 3 M, and 1 S tasks, **Then** planned
   allocation is 96%, remaining capacity is 4%, and no overload warning appears.
3. **Given** a 96% plan, **When** I add an M task, **Then** planned allocation is 101% and
   the dashboard states that the plan exceeds capacity by 1 percentage point. It allows the
   plan and does not rescale any task weight.
4. **Given** an editable day containing an incomplete L task, **When** I change its weight
   to M, **Then** the allocation decreases by 5 percentage points and the title is preserved.
5. **Given** an editable day, **When** I rename or remove a task, **Then** only that task is
   changed and allocation is recalculated from the remaining weights.
6. **Given** a task-entry form, **When** I submit a blank or whitespace-only title or no
   weight, **Then** the task is not added, the entered content remains available for correction,
   and an accessible message identifies the missing information.

---

### User Story 2 - Track Weighted Completion (Priority: P2)

As Jose, I want to mark completed tasks and see their weighted contribution so I can assess
my progress against the day's commitment.

**Why this priority**: Completion makes the plan useful during execution and at day end.

**Independent Test**: Open a prepared 96% plan, toggle selected tasks, and compare the displayed
completed weight, task count, and daily score with the agreed scoring examples.

**Acceptance Scenarios**:

1. **Given** the nine-task 96% plan with nothing complete, **When** I complete one XL and
   one M task, **Then** completed weight is 25 percentage points and the completed count is
   2 of 9. The daily score is 25%.
2. **Given** those two completed tasks, **When** I mark the M task incomplete, **Then**
   completed weight becomes 20 percentage points, count becomes 1 of 9, and the daily score becomes 20%.
3. **Given** the 96% plan, **When** I complete every task, **Then** completed weight is 96
   percentage points, count is 9 of 9, and the daily score is 96%.
4. **Given** an editable day with a completed L task, **When** I change its weight to M,
   **Then** both planned and completed weight decrease by 5 percentage points.
5. **Given** an editable day with a completed task, **When** I remove that task, **Then** its
   weight is removed from both totals and from the completed and total task counts.
6. **Given** a day with no tasks, **When** I review completion, **Then** I see 0 of 0 tasks,
   0 completed weight, and a score labeled “No plan” rather than a misleading percentage.

---

### User Story 3 - Save, Finalize, and Revisit a Day (Priority: P3)

As Jose, I want my plan and results to survive closing the dashboard and to reopen a saved
day so I can review what I committed to and accomplished.

**Why this priority**: Durable daily records are required to replace the spreadsheet and later
support monthly and yearly views.

**Independent Test**: Use a previously saved day, close and reopen the dashboard, select that
date, and compare titles, weights, completion states, and totals with the saved record.

**Acceptance Scenarios**:

1. **Given** a day whose changes are confirmed saved, **When** I close and reopen the
   dashboard and select the same date, **Then** its tasks, weights, completion states, and
   derived results are restored exactly.
2. **Given** two saved days, **When** I change a task on the editable day, **Then** the other
   day's tasks and results remain unchanged.
3. **Given** saved history, **When** I open a specific past date, **Then** I see that date's
   preserved commitment and results; monthly and yearly aggregate views are not required.
4. **Given** a save failure, **When** I attempt to preserve a change, **Then** the dashboard
   does not claim it was saved, keeps my unsaved input available in the current session, and
   offers a retry. After a successful retry, reopening shows one copy of the change.
5. **Given** an editable day with 96% planned and 80 points completed, **When** I finalize
   it and saving succeeds, **Then** it becomes read-only historical data with a score of 80%,
   preserving its date, tasks, weights, completion states, and totals after reopening.
6. **Given** a finalized day, **When** I view it, **Then** task editing and completion changes
   are unavailable until I explicitly choose to reopen the day.
7. **Given** a finalized day, **When** I explicitly reopen it and complete one additional
   M task, **Then** its score increases by 5 percentage points, its original date is retained,
   and it remains editable until I explicitly finalize it again.
8. **Given** an unfinalized day, **When** local midnight passes, **Then** that day remains
   editable on its original date; it is not automatically finalized or moved to today.
9. **Given** a failed save during finalization or reopening, **When** the operation fails,
   **Then** the dashboard reports failure and does not claim the lifecycle transition succeeded;
   retry preserves the original date and task identities.
10. **Given** an empty day, **When** I finalize it successfully, **Then** it is preserved as
    a read-only day with 0% allocation, 0 completed points, and “No plan” as its score.

### Edge Cases

- A plan can be below, equal to, or above 100%; values are not capped or normalized.
- Five XL tasks total 100%; six XL tasks total 120%, with 20 points over capacity.
- Removing the last task restores the empty-day state, including “No plan” for score.
- Equal task titles are allowed as separate entries; editing or completing one must not affect
  another. Retrying a save must not produce an unintended extra entry.
- Invalid weights and blank titles must not alter a valid saved record.
- Completed weight can equal but cannot exceed planned weight for the same task set.
- Reopening a day with unsaved changes must not silently present those changes as persisted.
- Loading or failing to load an existing day must not appear as a confirmed empty day or
  overwrite that day's saved record.
- Midnight does not finalize days, reset tasks, or reassign tasks to another date.
- A 120-point plan with every task complete has a daily score of 120%; neither allocation
  nor score is capped at 100%. A 96-point plan with 80 completed points scores 80%.
- Finalizing is permitted with incomplete tasks or no tasks; it does not complete tasks.
- Reopening a historical day restores editing on that date, without creating a second day.

### User Story 4 - Recognize the Daily Command Dashboard (Priority: P3)

As Jose, I want the daily page to match the supplied visual reference so the replacement
preserves the intended overview and hierarchy rather than becoming a generic task form.

**Why this priority**: The visual design establishes how planning and progress are reviewed.

**Independent Test**: Render a prepared day and compare the page composition with the reference
and documented substitutions without requiring future feature data.

**Acceptance Scenarios**:

1. **Given** a 1440px viewport, **When** I open Today, **Then** I see a persistent branded
   sidebar, greeting/date header, four summary cards, large plan table, stacked right panels,
   a lower-left Timeline/Calendar pair and right-column Notes/Insights in the new arrangement.
2. **Given** an editable day, **When** I choose Edit Plan, **Then** rename/weight/remove
   controls appear; Done returns to the table view without finalizing the day. Completion
   remains directly toggleable in the default view. Add task opens a labeled entry form.
3. **Given** the 96-point plan with three XL and two L completed, **When** I view the summary
   and progress ring, **Then** both show 80% with 80 / 100 daily budget points, task counts
   match the rows, and the plan footer shows 96 / 100 with 4% remaining.
4. **Given** this first feature, **When** I inspect future feature areas, **Then** streak,
   category breakdown, timeline, notes and Insights have labeled placeholders, Things sync is disabled,
   and no fabricated metrics, charts, scheduled times, or editable notes appear.
5. **Given** a 375px viewport, **When** I open navigation and use the core daily workflow,
   **Then** the menu and stacked panels preserve labels, values, focus and controls without
   horizontal page scrolling. History can select a saved date; deferred destinations are
   visibly unavailable rather than navigating to empty pages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST show the selected calendar date and allow opening today or
  a specific saved past date for review.
- **FR-002**: On an editable day, users MUST be able to add, rename, reweight, and remove
  individual tasks. Each task MUST have a nonblank title and exactly one valid weight.
- **FR-003**: Weights MUST initially be XL = 20, L = 10, M = 5, S = 1 percentage points of
  daily capacity. Weight configuration is outside this feature.
- **FR-004**: Planned allocation MUST equal the sum of all selected-day task weights. If
  allocation is at most 100, remaining capacity MUST equal 100 minus allocation. If allocation
  exceeds 100, the dashboard MUST show the excess as allocation minus 100.
- **FR-005**: The dashboard MUST allow plans below and above 100%, preserve their actual
  totals, and describe a 96% allocation as valid with 4% remaining. A textual over-capacity
  indication MUST appear only above 100%; no additional warning bands are introduced here.
- **FR-006**: Users MUST be able to toggle each editable-day task between complete and
  incomplete. Completion MUST contribute the task's whole weight; partial completion is
  outside this feature.
- **FR-007**: The dashboard MUST distinguish planned allocation, completed weight, completed
  task count, and daily score. Completed weight MUST equal the sum of completed tasks' weights;
  counts MUST reflect the selected day's actual task set.
- **FR-008**: Daily score MUST equal completed weight divided by the fixed 100-point daily
  budget, expressed as a percentage. Thus 80 completed points out of 96 planned scores 80%,
  all 96 completed points scores 96%, and 120 completed points scores 120%. Scores MUST NOT
  be normalized against planned allocation or capped at 100%. A day with tasks but none
  complete MUST score 0%; a day with no tasks MUST display “No plan”.
- **FR-009**: Changes to editable tasks MUST immediately update all affected displayed totals
  and counts. Removing a completed task MUST remove its contribution from both totals.
- **FR-010**: The system MUST preserve the selected day's task identities, titles, assigned
  weights, completion states, and calendar date after a confirmed save and reopening.
- **FR-011**: The dashboard MUST distinguish pending, saved, and failed persistence states.
  Failed saves MUST retain unsaved input for retry in the current session and MUST NOT
  overwrite the last successfully saved record with an empty or incomplete load result.
- **FR-012**: Changes on one day MUST NOT affect another day's task set or results. Historical
  results MUST use the values preserved with that day rather than current defaults.
- **FR-013**: Days MUST begin editable and become historical only through an explicit
  Finalize Day action. A successfully finalized day MUST preserve its date, tasks, assigned
  weights, completion states, and results, and MUST be read-only. Users MUST explicitly
  choose Reopen Day before changing historical data; the day then becomes editable on its
  original date until finalized again. Midnight MUST NOT finalize a day. Finalization MUST
  allow incomplete or empty plans without changing task completion. A transition MUST NOT
  be reported successful until its data and state are saved; failure MUST preserve the last
  confirmed saved record and allow retry.
- **FR-014**: The daily dashboard MUST use a clean dark theme and provide keyboard-operable
  task entry, weight selection, completion, date navigation, finalization, and reopening,
  with accessible names and
  visible focus. Completion, allocation, and save status MUST have textual indicators.
- **FR-015**: At viewport widths of 375 and 1440 pixels, core controls, task titles, and
  totals MUST remain available without horizontal page scrolling or overlapping controls.
- **FR-016**: Empty, loading, load-error, validation-error, and save-error states MUST be
  distinguishable. Load errors MUST offer retry without claiming that saved tasks are absent.

- **FR-017**: The daily page MUST follow the supplied reference's composition and visual
  hierarchy as defined in the UI contract: sidebar, greeting/date header, four summary cards,
  plan table, Progress/Category/Guide/Notes/Insights right stack, and Timeline/Calendar pair
  under the left plan. Deferred capability
  slots MUST be explicitly labeled and MUST NOT show fabricated data or active actions.
- **FR-018**: Editable days MUST start in table view, offer Edit Plan/Done presentation modes,
  support direct completion toggles in view mode, and open task creation through Add task.
  Presentation mode MUST NOT lock/finalize the plan or change persistence guarantees.
- **FR-019**: All completion cards and rings MUST show the same fixed-budget daily score.
  Their supporting denominator MUST be 100; the screenshot's normalized 60 / 96 display MUST
  NOT replace FR-008. Weight Guide copy MUST describe commitment capacity, not time estimates.

- **FR-020**: The dashboard MUST include the embedded monthly historical-score calendar from
  the latest reference, with month navigation, score-color legend, keyboard-accessible saved-day
  selection and a selected-date outline. It MUST use actual saved results and distinguish
  missing/no-plan records from genuine zero scores despite shared neutral styling. Historical eligibility,
  provisional states and future-date presentation remain separate lifecycle clarifications.
  Classification MUST use the confirmed shared mapping; above-100 scores are bright green.
  Existing FR-008 remains unchanged.

- **FR-021**: Every component displaying a daily completion score MUST use
  [the shared score-color mapping](contracts/score-colors.md): >=95 bright green, >=85–<95 green,
  >=65–<85 yellow, >=45–<65 orange, >0–<45 red, and 0 neutral No data. Missing/null also use
  neutral styling without changing stored scores. Classify before rounding; above-100 remains
  bright green. Planned allocation and non-score colors are unaffected.

### Key Entities *(include if feature involves data)*

- **Daily Plan**: The commitment for one calendar date, its task entries, preservation state,
  and saved status. An explicitly finalized day is historical and read-only until reopened.
- **Daily Task**: A distinct entry belonging to one day, with a title, assigned weight label,
  preserved numeric weight, and complete/incomplete state.
- **Daily Result**: Planned allocation, completed weight, completed/total task count, and
  daily score derived from the selected day's preserved values and agreed scoring rule.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jose can enter the nine-task example, assign all weights, and verify 96% planned
  allocation with 4% remaining within three minutes, without using the spreadsheet.
- **SC-002**: Every worked allocation and daily-score example produces the specified result,
  including empty and above-capacity days.
- **SC-003**: For a day containing up to 100 tasks, completion and weight changes display
  updated totals within one second of the user action.
- **SC-004**: After confirmed saves and reopening, 100% of task titles, identities, weights,
  completion states, dates, and results match the saved records in acceptance scenarios.
- **SC-005**: All core daily workflows can be completed with a keyboard, and all statuses
  remain understandable without color at the two specified viewport widths.
- **SC-006**: Save/load failure acceptance scenarios preserve the last confirmed record and
  offer a successful retry without losing current-session input or duplicating entries.

- **SC-007**: Every finalize/reopen acceptance scenario preserves the selected date and task
  identities, prevents edits while finalized, and leaves other days unchanged.

- **SC-008**: Rendered review at 1440px and 375px verifies all required regions, edit/add
  interactions, disabled future features and scoring substitutions in User Story 4 against
  the image and design-reference.md, with no fabricated supporting data.

### Remaining calendar lifecycle clarification

Score calculation is unchanged and application-wide color intervals are confirmed. Calendar
historical eligibility (finalized versus open/provisional days) and future-date presentation
remain to clarify independently. Do not treat the approved colors as pending scoring rules.

## Assumptions

- The first slice serves Jose as a single user. Collaboration, multiple accounts, and access
  management are not introduced by this specification.
- Manual task entry is the first slice. Things 3 integration is a later feature within the
  overall MVP; this feature neither reads nor changes Things data.
- Daily review by date is included. Yearly and aggregate monthly summaries, spreadsheet import, categories,
  recurring tasks, reminders, AI coaching, and advanced analytics are outside this slice.
- Local calendar dates initially use Jose's America/New_York timezone. Changing timezones
  and their effect on existing days require a later explicit policy.
- New tasks start incomplete. Weight settings remain fixed for this slice.
- Automatic persistence with visible pending/saved/failed feedback is the working assumption;
  there is no separate morning plan lock. Explicit end-of-day finalization and reopening
  govern historical editing.
- Availability across multiple devices and offline editing are not promised by this slice.
  Storage and hosting decisions belong to technical planning.
- Future-feature placeholders preserve visual composition only; they introduce no category,
  streak, notes, timeline, priority, or Things data into this feature.

- The embedded monthly score calendar is the newly requested scope addition; it does not imply
  a separate calendar route, yearly reporting, or automatic scoring changes. Insights remains
  upcoming supporting content without generated recommendations.
