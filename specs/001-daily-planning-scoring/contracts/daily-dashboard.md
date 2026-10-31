# Daily Dashboard UI Contract

## Reference and scope

The latest square dark Central Command dashboard image (with calendar and Insights) replaces
the earlier portrait reference. It is the active visual reference. See
[reference reconciliation](../design-reference.md) for differences and scope decisions.
On 2026-10-31 Jose chose: match the layout now; add the additional capabilities in follow-up
specifications. This contract preserves that composition without presenting fake working data.
The confirmed fixed-budget score and explicit finalize/reopen lifecycle take precedence over
contradictory sample text or numbers in the image.

## Desktop composition

- Use an almost-black page and persistent left sidebar, separated by a subtle vertical border.
  Place the blue outlined brand symbol and Central Command name at the top. Today is selected
  in a rounded dark highlight. Place a compact identity footer at the bottom without implying
  account switching or authentication.
- Preserve sidebar order: Today, Calendar, History, Analytics, Categories, Settings. Today
  is the current dashboard. History opens the saved-date selection control within this page.
  Calendar focuses the embedded historical-score calendar; Analytics, Categories, and Settings
  are disabled with accessible “Coming later”
  descriptions until their features exist. Do not create empty functioning destinations.
- Main header: personalized greeting “Good morning, Jose.” (afternoon/evening as appropriate
  in America/New_York) with the full selected date beneath. For a past date use “Your day, Jose.”
  instead of implying the selected date is today. Keep Today/date selection available as a
  compact secondary control; selecting a date does not finalize it.
- Reserve the top-right action position for Sync with Things, disabled with “Coming later”
  explanatory text. Put lifecycle actions in an accessible More day actions menu beside it.
  Visible Editable/Finalized and save-status text must remain outside the menu.
- Four equal summary cards span the main header row: Planned, Completed, Tasks, Streak.
  Below, place Today's Plan as the large left panel. Stack Today's Progress, Points by Category,
  Weight Guide, Notes for Today, and Insights down the right column. Under Today's Plan,
  split the left column into Today's Timeline (wider) and a compact monthly score calendar
  (narrower). The calendar can extend vertically beside the lower-right Insights card. On historical dates replace “Today's”/“Today” in panel titles
  with the selected date's context.
- Use subtle panel borders, rounded corners, restrained shadows, generous spacing and fine
  dividers. Accent mapping: blue allocation, shared score-based completion, purple task count, orange
  streak slot. Weight badges: blue XL, amber L, yellow M, green S. Icons support text labels.

## Summary cards and progress

- Planned: large allocation percentage, blue ring, “96 / 100” and “capacity used” for a
  96-point plan. Keep remaining/excess text in the plan footer. Allocation is never normalized.
- Completed: large fixed-budget daily score and ring colored by the shared score mapping. For 60 completed points,
  display “60%”, “60 / 100”, and “daily budget completed”; do not display 62% or 60 / 96.
  A plan with no tasks displays “No plan”; a nonempty plan with no completions displays 0%.
- Tasks: total count, completed count and remaining task count, derived from actual rows.
- Streak: retain the card's title/icon/position but display “Coming later”, with no fabricated
  current/best streak, flame count, or sidebar streak metric. The sidebar may reserve the
  same lower area with a labeled future streak card, without hardcoded numbers.
- Today's Progress: score-colored ring centered on the same daily score as Completed. Supporting
  text says “60 / 100 daily budget points” for that example. Place the ring on the left and the curve slot on the right within the wide panel;
  replace the image's intraday line graph with “Progress over time coming later”. No fake
  timestamps, history curve, forecast, or normalized second progress metric.
- Ring geometry may fill one revolution at 100%; all numeric values remain uncapped. Above
  100 show the actual value and an overflow text indicator, never a misleading capped score.

## Today's Plan and editing workflow

- Panel heading and Edit Plan action lead into a table with Task, Weight, Points, Status
  columns. View mode is the default; title and weight appear as text/badges, not an always-open
  form. Status is an accessible checkbox styled as the image's outlined circle/green check.
  It remains directly toggleable on editable days without entering Edit Plan.
- Edit Plan reveals inline rename, weight selection, and remove controls; Done returns to
  view mode. It is a presentation mode, not a lock/finalize action. Changes autosave; Done
  does not falsely claim pending changes are saved. Finalized days expose no task edit controls.
- Rows show actual assigned points and subtle separators. Do not reproduce red exclamation
  marks from the mockup: urgency/priority is not defined in this feature and must not be
  inferred from task weight.
- Footer: total allocation as “96 / 100” with “4% remaining” for the agreed example. Above
  capacity show actual allocation and textual excess instead. Below the footer, provide the
  full-width dashed Add task action, matching the reference's placement.
- Add task opens a compact accessible form with labeled title and weight controls and Add/
  Cancel actions. Validate nonblank trimmed title and an explicitly selected valid weight;
  preserve invalid input and describe errors. New tasks start incomplete; duplicate titles
  are allowed as distinct entries. Return focus to a predictable control after add/remove.
- Weight Guide uses a compact horizontal four-item strip with badge, point value, and
  commitment-budget description for each weight:
  XL 20 points/20% of daily capacity; L 10/10%; M 5/5%; S 1/1%. Do not copy “time intensive”,
  “significant effort”, or “quick win”: weights are chosen budget commitments, not durations.

## Reserved supporting panels

- Points by Category: preserve heading and panel placement; show “Category breakdown coming
  later”. No donut, category legends, or totals without categorized data and an agreed policy.
- Today's Timeline: preserve the lower-left panel beside the monthly calendar and its heading; show “Task scheduling
  coming later”. Do not invent task times or completion timestamps.
- Notes for Today: preserve the compact right-column panel below Weight Guide and its heading with “Daily notes coming later”.
  No editable note box or active pencil action until persistence and lifecycle are specified.
- Insights: add the bottom-right supporting panel below Notes for Today. Show “Insights coming
  later”; no invented trends, category comparisons, productivity times or recommendations.
  View all is disabled with an accessible explanation.
- Disabled/reserved areas must look intentional, clearly explain availability, and never
  appear as errors, zero performance, or live data. They are part of the visual shell only.

## Historical score calendar

- Include the compact monthly calendar beside Today's Timeline under the plan. Its heading
  shows month/year with Previous month and Next month buttons; use Sunday-first weekday
  headings and a correctly aligned date grid. Sidebar Calendar focuses this panel.
- Read actual saved daily results for the displayed month. Selecting a saved date opens its
  daily plan through the existing date-selection flow without finalizing or discarding drafts.
  Highlight the selected day with an outline distinct from score color; mark today separately.
- All score cells, Completed card/ring and Today's Progress text/ring MUST use the confirmed
  [shared score colors](score-colors.md). Use its exact intervals and legend, replacing the
  outdated screenshot. 80% is yellow, 85% green, 95% bright green, and 0 uses No data styling.
- Missing/null and actual zero share neutral styling but retain distinct numeric/state labels.
  Calendar historical eligibility (finalized/open/provisional) and future-date treatment remain
  separate pending decisions; they do not block implementing the shared color classifier.
- Use readable accessible date/score/state labels and keyboard-operable date buttons; color
  alone cannot convey scoring. Loading/failure is visible with Retry, never fabricated no-data.

## Lifecycle, persistence, and navigation

- More day actions offers Finalize Day on an editable day and Reopen Day on a finalized day.
  Both have accessible names and keyboard operation. Finalize first flushes pending changes;
  lifecycle changes only after persistence succeeds. Disable conflicting actions in flight.
- Autosave committed form edits after 300ms; toggle/remove may save immediately. Update totals
  immediately, serialize requests per date, retain newer changes, and show Pending/Saved/
  Save failed with Retry. Keep the last confirmed lifecycle state on transition failure.
- Preserve per-date unsaved drafts across in-page date navigation. Warn before page exit with
  unsaved data where supported. Reload after conflict requires explicit discard consent.
- Loading uses skeletons/status within the same composition, never fake data or an empty-day
  claim. Load failure provides Retry and blocks writes; only a successful absent-record result
  displays an empty plan. Distinguish validation, save, and load errors.

## Responsive and accessible behavior

- At 1440px use persistent sidebar, four-card summary row, two-column content with a slightly wider plan column, a split timeline/calendar region
  under the plan, and right-column Progress/Category/Guide/Notes/Insights stack. The active
  reference is square; avoid the old portrait layout with Notes beside a full-width timeline.
- At 375px collapse navigation behind a labeled menu; stack summary cards in two columns
  where readable, then Plan, Progress, Category, Guide, Notes, Timeline, Calendar, and Insights
  in readable stacked order; the calendar must not require horizontal page scrolling. Task rows may become labeled cards to
  keep all four fields and controls accessible without horizontal page scrolling.
- All controls have semantic roles, accessible names, visible focus and keyboard operation.
  Use polite announcements for save/progress updates and alerts for failures. Disabled feature
  explanations remain discoverable. Chart/ring values have readable text equivalents.
- Verify readable contrast, long titles, focus after menu/form actions, no overlapping controls,
  and status comprehension without color. Target WCAG AA contrast. No decorative graph is
  required to convey the actual score.

Manual timing and rendered review follow [quickstart](../quickstart.md). These are design
contracts, not delivered UI. Implemented screenshots must be reviewed against the reference
composition with the documented substitutions above.
