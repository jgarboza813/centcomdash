# Dashboard Reference Reconciliation

**Date**: 2026-10-31
**Reference**: Latest square Central Command dashboard image supplied by Jose, including a
monthly historical-score calendar and Insights. This replaces the earlier portrait image.
The image is not currently a checked-in repository asset; this document records its relevant
composition. Visual review can use the conversation attachment; do not claim a local image exists.

**User scope decision**: “Match layout; add capabilities in follow-up specs (Recommended)”.
The image establishes composition and styling, while confirmed product rules establish behavior.

## Latest reference changes

- Main plan remains left; Progress is a wide right panel with ring and curve side by side.
- Right stack: Progress, Points by Category, horizontal Weight Guide, compact Notes, Insights.
- Below the left plan: Timeline and monthly score calendar side by side, rather than the old
  full-width timeline and separate lower-right Notes composition.
- Retain the four summary cards, with task icon and future streak decoration positions.
- Calendar is now planned functionality: real historical daily scores encoded by color,
  month navigation, date selection, selected-date outline and interval legend.
- Insights joins the upcoming supporting panels; it stays a labeled future feature along with
  category breakdown, notes, timeline, streaks and Things integration. No fabricated insights.

## Confirmed score colors supersede the pictured legend

Jose clarified that the review concerns shared score colors, not score calculation. Use
[score-colors.md](contracts/score-colors.md) across Calendar, Completed and Today's Progress:
>=95 bright green; >=85–<95 green; >=65–<85 yellow; >=45–<65 orange; >0–<45 red; 0 No data.
The screenshot legend is outdated. Above-100 scores are bright green. Calendar eligibility
and future-date presentation remain separate lifecycle questions; thresholds are resolved.

## Earlier discrepancies still relevant

| Area | Image | Previous contract | Resolution |
| --- | --- | --- | --- |
| App shell | Persistent brand/sidebar with six navigation entries | Header/date controls only | Specify sidebar and collapsed mobile navigation |
| Header | Personalized greeting, full date, Things action, overflow | Generic title and picker | Preserve greeting/action positions and lifecycle menu |
| Summary | Four cards with rings and distinct colors | Unstructured metric list | Specify Planned/Completed/Tasks/Streak card row |
| Plan interaction | View table, Edit Plan, badge/points/status, total and dashed Add | Inline controls without view/edit distinction | Specify view/edit mode and add form |
| Supporting content | Progress, category donut, guide, timeline, notes | Omitted | Preserve panels; implement guide/progress, reserve future panels |
| Completion | 62% and 60 / 96 | Fixed-budget score | Use 60% and 60 / 100 for 60 completed points |
| Weight meanings | Impact/effort/time descriptions | Commitment weights | Use daily-capacity descriptions from constitution |
| Lifecycle | No obvious finalize/reopen | Required explicit lifecycle | Put actions in day menu with visible state |

## Mockup data cannot be copied as acceptance data

The eleven task rows show 3 XL (60), 1 L (10), 2 M (10), and 5 S (5): **85 points**, not 96.
The seven checked rows contribute **73 points**, not 60. The task counts (11, 7 done, 4 left)
match those rows, but the allocation/completion cards do not. The image's 60 / 96 is 62.5%
before rounding and uses a denominator Jose explicitly rejected for the daily score.
The timeline shows four completed high-weight tasks (70 points), and its timestamps/curve
are illustrative rather than recorded data. Do not infer a scheduling or forecasting policy.
Use the specification's consistent nine-task 96-point example for acceptance validation.

## Follow-up feature inventory

- Things sync: source selection, imports, identity, status reconciliation and sync failures.
- Embedded historical-score calendar is added to the planned slice, with shared colors confirmed.
  Broader yearly calendar/aggregate views remain follow-up features.
- Categories and breakdown: category assignment, preserved historical membership, and whether
  slices represent planned or completed points.
- Insights: define evidence, aggregation windows and recommendation behavior separately;
  do not introduce advanced analytics or AI via decorative sample insight text.
- Streaks: qualifying day threshold, unfinished/absent day handling, timezone and corrections.
- Timeline and progress curve: scheduling versus completion timestamps, editing, ordering,
  and real data for intraday changes. Forecasts require a separately approved feature.
- Daily notes: saved text, limits, lifecycle behavior, and historical correction rules.
- Settings/profile: configurable values and identity behavior; no account switching implied.
- Priority flags: meaning/source of the red exclamation marks, if wanted at all.

Reserved panels and disabled actions are explicitly labeled Coming later in this slice.
The embedded score calendar is functional planned scope, not a Coming later placeholder, but
its colors follow the confirmed shared mapping; lifecycle eligibility remains to clarify.
These follow-ups are not bundled into the current implementation and do not authorize advanced
analytics or AI work outside the constitution's MVP boundaries.
