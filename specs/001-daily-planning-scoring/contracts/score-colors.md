# Shared Daily Score Color Contract

**Confirmed by Jose**: 2026-10-31. Replaces all screenshot legends and earlier proposed bands.
This is a presentation mapping; the fixed-budget daily score calculation is unchanged.

| Score | Semantic color |
| --- | --- |
| >=95% | Bright green |
| >=85% and <95% | Green |
| >=65% and <85% | Yellow |
| >=45% and <65% | Orange |
| >0% and <45% | Red |
| 0% | No data (neutral gray) |

The confirmed orange upper bound is 65%, eliminating the earlier yellow/orange overlap.
Zero is a special case evaluated before the below-45 red band. Values above 100 remain
uncapped and bright green. Classify the actual numeric score before display rounding.
Missing records and null/“No plan” scores also use neutral no-data styling, but remain distinct
underlying states: do not convert missing/null to numerical zero or erase a genuine saved 0%.
A nonempty zero-score day still shows 0% in score summaries; its calendar uses the neutral
No data legend class without showing a numeric score, including in accessible labels. The saved
zero remains available in the daily detail rather than being erased.

## Application-wide use

One shared score-band function and semantic CSS tokens MUST drive Calendar score cells,
Completed card text/ring, Today's Progress text/ring, and every future daily-score badge or
summary. The same score always gets the same semantic color. Calendar may use darker fills
for contrast while retaining the same semantic token family. Final color values must provide
readable contrast on the dark theme and distinguish bright green from green.

The Planned allocation ring remains blue. Weight badges, category colors, task count accents,
and completion-checkbox indicators do not encode daily score and retain their own colors.
Do not infer a daily score color from a category or task weight.

Legend labels: “>=95%”, “85–<95%”, “65–<85%”, “45–<65%”, “>0–<45%”, “No data”.
Provide score/band text equivalents rather than relying on color alone. Calendar date-selection
outline and today indicator remain distinct from the score band.

## Boundary acceptance examples

| Score | Expected class |
| --- | --- |
| null or missing | No data |
| 0 | No data |
| 1, 44 | Red |
| 45, 64 | Orange |
| 65, 74, 75, 84 | Yellow |
| 85, 94 | Green |
| 95, 96, 100, 120 | Bright green |

Test fractional values just below 45, 65, 85 and 95 too; rounding must not move a score into
a different band. Verify identical classifications across Calendar, Completed and Progress.

Calendar score eligibility requires date <= today in America/New_York, finalized status, and score >0. Otherwise show “No data” with neutral styling and no numeric calendar score. Finalized today is eligible immediately; reopening hides the score until refinalization. Daily Completed/Progress retain live scores regardless of finalization.
