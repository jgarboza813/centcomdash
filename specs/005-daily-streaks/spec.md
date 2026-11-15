# Feature Specification: Daily Scoring Streaks

**Feature Branch**: `main` (no feature branch created)

**Created**: 2026-11-14

**Status**: Ready for planning

**Input**: Implement the streak feature next. Confirmed qualifying rule: a finalized day with a score of at least 85%.

## Clarifications

### Session 2026-11-14

- Q: What should a day need to count toward the streak? → A: Finalized with a score of at least 85%.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a Current Daily Streak (Priority: P1)

Jose finalizes high-scoring days and sees the number of consecutive days meeting his scoring goal.

**Why this priority**: Makes consistent daily follow-through visible using saved results rather than unfinished work.

**Independent Test**: Finalize controlled consecutive days above/below 85% and compare the current streak across qualifying today, unfinished today and missed-day boundaries.

**Acceptance Scenarios**:

1. **Given** no qualifying finalized days, **When** the dashboard loads, **Then** the current streak shows 0 days instead of Coming later or a fabricated count.
2. **Given** yesterday is a finalized 85% day and today is editable, **When** Jose reviews the dashboard, **Then** the current streak is 1 day and today has not been counted.
3. **Given** the preceding three calendar days are qualifying finalized days, **When** Jose finalizes today at 87%, **Then** the current streak becomes 4 days.
4. **Given** the current streak is 4 days, **When** the same successful finalize result is replayed or the page is refreshed, **Then** the streak remains 4 rather than incrementing again.
5. **Given** yesterday ended editable, missing or finalized below 85%, and today is editable, **When** the dashboard loads, **Then** the current streak is 0 days.
6. **Given** a streak through yesterday, **When** today is finalized below 85%, **Then** the current streak becomes 0 immediately.
7. **Given** today has reached 90% but is not finalized, **When** tasks are checked or synced, **Then** today does not extend the streak until finalization succeeds.

---

### User Story 2 - See a Reliable Personal Best (Priority: P2)

Jose sees his longest recorded run and can deliberately correct a saved day without stale or misleading streak totals.

**Why this priority**: A best streak provides useful progress context and must agree with actual finalized history.

**Independent Test**: Seed multiple qualifying runs separated by nonqualifying days, then reopen/correct/refinalize a day and compare current and best counts.

**Acceptance Scenarios**:

1. **Given** past runs of 3 and 7 qualifying calendar days and a current run of 2, **When** Jose views the dashboard, **Then** current shows 2 and best shows 7.
2. **Given** a best streak of 7 and a new qualifying run of 8, **When** the eighth day is finalized, **Then** current and best both show 8.
3. **Given** a qualifying day in a saved run, **When** it is successfully reopened, **Then** that day no longer qualifies and streaks are recalculated from the remaining finalized days. Existing day tasks, assigned weights and score rules are preserved.
4. **Given** today was finalized below 85% and broke the current streak, **When** it is reopened, **Then** the unfinished-today grace rule applies again; refinalizing at or above 85% extends the qualifying run through yesterday.
5. **Given** a correction reduces a past best run, **When** that day is reopened or refinalized below 85%, **Then** best reflects the longest run still present in saved history, even if lower than its previous value.
6. **Given** failed finalization, reopening or saving, **When** an error appears, **Then** streaks retain their values based on the last successfully saved history and no success is claimed.

---

### User Story 3 - Review Consistent Streak Information Anywhere (Priority: P3)

Jose sees matching current/best values in the summary and sidebar, with a clear explanation of the goal and no interference with his daily workflow.

**Why this priority**: Keeps the feature understandable and consistent across responsive layouts and day navigation.

**Independent Test**: Compare summary/sidebar values across today/history navigation, collapsed/expanded sidebar states, reload and date rollover.

**Acceptance Scenarios**:

1. **Given** a current streak of 3 and best of 6, **When** the dashboard displays the summary and expanded sidebar, **Then** both show matching real values with day/day(s) wording and the existing streak/flame visual treatment.
2. **Given** the compact sidebar at tablet width, **When** Jose reviews its streak indicator, **Then** the current count is available in the compact rail and an accessible/hover description provides current, best and the qualifying rule without overflowing the rail.
3. **Given** a historical day is selected, **When** Jose reviews the Streak summary, **Then** it continues to mean the current streak as of today, clearly labeled, rather than silently changing to a historical-as-of count.
4. **Given** the streak UI, **When** Jose reads its help text or accessible description, **Then** it explains “Finalize each day with at least 85% to build your streak.” Counts are understandable without relying on color or a flame icon alone.
5. **Given** a New York midnight passes while the dashboard remains open, **When** the next day begins while the page is active, **Then** streak eligibility refreshes within one minute without finalizing a day, changing the selected date, saving a plan or initiating a Things read.
6. **Given** streak information cannot load, **When** the error is displayed, **Then** the UI distinguishes unavailable data from a genuine zero and offers retry without blocking task editing or Things Sync.

### Edge Cases

- Qualification is finalized status plus the existing fixed-budget daily score >=85. A finalized 85 qualifies; 84 does not. Exactly 95, 100 and above 100 qualify. Planned allocation, task count and fraction of planned work completed do not define streak qualification.
- Scores are the existing completion points out of the fixed 100-point budget; no new denominator or normalization is introduced.
- Calendar dates are consecutive in America/New_York, including weekends, month/year transitions, leap days and daylight-saving changes. Do not treat a day as a fixed 24-hour interval.
- Missing, empty, editable, zero-score and finalized-below-85 past days break runs. Future-dated records are ignored for current and best streaks.
- Today may extend the current streak only if it qualifies. If today is editable or absent, count the qualifying run ending yesterday. If today is finalized below threshold, current is 0 immediately.
- If neither qualifying today nor qualifying yesterday under the grace rule anchors a run, current is 0. A qualifying run older than yesterday can still contribute to best.
- Reopening a historical qualifying day breaks that run until it is qualifying and finalized again; deliberate corrections may change current/best but must not silently change other saved days.
- Reopening today returns it to the unfinished-today grace rule, potentially restoring yesterday's count without counting today itself.
- Replayed finalize/reopen requests and repeated reloads do not duplicate a qualifying day.
- Unsaved drafts never affect counts. If a read fails after a successful transition, retain previously loaded values only as explicitly stale while reporting the refresh failure; do not invent a new count.
- Sorting, changing dates, editing layout and refreshing streak data must not initiate Things reads or create plan saves.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A day MUST qualify only when successfully saved as finalized with its existing daily score >=85%. Scores MUST use the current fixed-budget scoring rule, with no weight, denominator, rounding or calendar-color change introduced by this feature.
- **FR-002**: The current streak MUST count the consecutive qualifying calendar-day run ending today when today qualifies. For absent/editable today, it MUST count the run ending yesterday. A finalized nonqualifying today MUST yield current=0.
- **FR-003**: Past missing, editable or nonqualifying days MUST break a run. Consecutiveness MUST use America/New_York calendar dates, including weekends and date/DST boundaries; future dates MUST not contribute.
- **FR-004**: Best streak MUST be the longest qualifying run in all saved history dated today or earlier, including the current run, or 0 when none exists.
- **FR-005**: Counts MUST derive from successfully saved day state and refresh after successful finalization, reopening or an acknowledged correction that affects finalized history. Unsaved drafts, task completion on editable days and in-flight/failed mutations MUST not extend a streak.
- **FR-006**: Reopening and deliberate historical corrections MUST recalculate affected streaks without modifying other recorded commitments or results. Best MAY decrease when the saved history supporting it is corrected; it is not an immutable achievement counter.
- **FR-007**: The summary Streak card and sidebar MUST replace their Coming later content with consistent current/best values. The main summary MUST identify its count as the current streak; expanded sidebar shows current and best, while the compact rail exposes current count and accessible/hover details.
- **FR-008**: Current and best MUST be global as of today even while another date is selected. Navigation MUST not silently reinterpret them as historical-as-of counts.
- **FR-009**: The UI MUST provide the >=85% finalized-day rule through accessible explanatory text/help, retain the existing streak visual style, use correct singular/plural wording and communicate counts without relying on color alone.
- **FR-010**: Saved-history changes and page reloads MUST update streaks without double counting. While the page is active across New York midnight, qualification MUST refresh within one minute; a suspended/background page MUST refresh immediately on return while leaving the selected date, saved plans and Things source untouched.
- **FR-011**: Streak loading/error/retry states MUST distinguish unavailable from zero. Previously loaded values shown after a refresh failure MUST be labeled stale; no incorrect success count may be guessed. Streak failure MUST not block existing planning, sorting, finalization or sync workflows.
- **FR-012**: Streak calculation/display/refresh MUST never initiate a Things read, automatically finalize a day, modify tasks or create plan-save operations. Existing explicit Things Sync, finalization, recovery and sorting behavior MUST remain unchanged.
- **FR-013**: At 375px, 800px and 1440px, streak counts, best value, help and error feedback MUST fit their summary/sidebar layouts without horizontal overflow or control overlap, including multi-digit counts. Keyboard-accessible retry/help and focus indicators MUST remain usable.

### Key Entities *(include if feature involves data)*

- **Qualifying day**: A saved finalized date whose existing daily score is at least 85%, evaluated in the app's established timezone.
- **Qualifying run**: A consecutive sequence of qualifying calendar dates, described by start date, end date and day count.
- **Streak summary**: Current count, best count and the calendar date on which they were evaluated, shared by summary/sidebar presentation. Loading/stale/error state is distinct from numeric values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Controlled saved histories produce exact expected current/best counts for no data, 84/85 boundaries, above-100 scores, missing/editable days, finalized-failing today and unfinished-today grace.
- **SC-002**: Runs spanning a weekend, month/year change, leap day and both New York DST transitions count each qualifying calendar day exactly once.
- **SC-003**: Successful finalize/reopen/correction is reflected in both visible streak locations within one second of the refreshed saved-history result; failed or replayed operations never introduce an extra qualifying day.
- **SC-004**: Summary/sidebar show identical counts at 375px, 800px and 1440px with no overflow or overlap. Zero, one-day, three-digit and four-digit counts remain understandable with accessible labels/help.
- **SC-005**: Pure streak refresh/navigation/sorting produces zero source reads and zero plan mutations, and crossing New York midnight refreshes eligibility within one minute on an active page (or immediately on resuming a suspended page) without changing the selected day.
- **SC-006**: Source-independent streak read failures show unavailable or explicitly stale values and an operable retry; ordinary task workflows remain usable throughout those failures.

## Assumptions

- The user explicitly confirmed finalized score >=85% as the qualifying goal. It is fixed for this increment; configurable thresholds are follow-up scope.
- Consecutive means every calendar day, including weekends. There are no skipped days, freeze tokens, weekly goals or streak repair shortcuts.
- Proposed timing policy: unfinished today preserves yesterday's run; a finalized failing today breaks current immediately. Reopening restores unfinished status and its grace behavior. These are recorded defaults for review.
- Best represents the longest run still supported by saved history and can decrease following deliberate corrections; permanent achievement badges are out of scope.
- The summary/sidebar use existing saved day history across the complete recorded date range, not just the displayed month. Existing qualifying finalized days count immediately, with no migration that rewrites them.
- No notifications, rewards, charts, AI coaching, automatic finalization or source synchronization are added. The feature depends on existing saved scoring and finalization behavior.
