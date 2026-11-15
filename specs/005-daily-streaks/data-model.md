# Data Model: Daily Scoring Streaks

## Saved day input (existing, unchanged)

The authoritative input remains days(date,record), with saved Plan date, finalized/editable status,
scoreRule=fixed-budget-v1 and assigned task weightPoints/completed values. Reuse result(plan.tasks),
not current default weights, planned allocation or completed/planned ratios. No new persisted field.

For this read, require a valid calendar date matching the row key, supported schema/rule/status and
an array whose score inputs have boolean completion and finite nonnegative assigned points. Malformed
or unsupported selected history fails the read; never skip broken rows and return partial streaks.
Ignore rows dated after the captured server asOfDate. Reads never normalize/backfill or rewrite history.

## Day score projection

`{ date: YYYY-MM-DD, status: 'editable' | 'finalized', scorePercent: number | null }`.
Dates are unique. Non-null scores are finite and nonnegative, uncapped. A pure calculation accepts
these saved-state projections plus a validated asOfDate; it sorts a copy and never mutates input.
Qualification is finalized && scorePercent !== null && scorePercent >=85. Editable status never qualifies.

## Qualifying run (calculation only)

`{ startDate, endDate, length }`: inclusive adjacent qualifying calendar keys. length is a positive
integer. A missing/nonqualifying date splits runs. Use calendar-key adjacency at month/year/leap/DST
boundaries, never elapsed time between local instants. No skipped weekends or duplicate-day counting.
Run dates can remain internal; the current UI needs only counts.

## Streak summary (read-only result)

```json
{"asOfDate":"2026-11-14","current":3,"best":7}
```

- asOfDate: server's captured New York date, valid YYYY-MM-DD. Not the selected date.
- current: integer >=0; length of the qualified run ending today, or ending yesterday only if today
  is absent/editable. Finalized nonqualifying today yields 0, with no grace.
- best: integer >=current and >=0; maximum qualifying run through asOfDate, or 0 for empty history.

Result is derived per request. No IDs, task/project data, history lists, request counter, saved streak
ledger or configurable threshold fields are sent. Client validates the response shape/invariants;
malformed responses become read failures rather than displaying invented values.

## Shared client state

One App-owned hook shares `{data?, phase, error?, retry}` between both presentations.

| Phase | Data shown | User feedback |
| --- | --- | --- |
| Initial loading | No number / dash | Loading streak |
| Ready | Accepted summary | Current/best and rule/help |
| Refreshing | Last accepted summary if present | Updating; no optimistic increment |
| Initial failure | No number | Streak unavailable + retry |
| Refresh failure / stale | Last accepted summary with its asOfDate | Explicit Stale label + retry |

A request generation/abort handle and last-observed client New York date are transient hook state.
Only the latest active request may commit data or errors. New requests invalidate previous requests;
unmount cancels timers/listeners/reads. Superseded cancellation does not change UI to error.

## Refresh and mutation transitions

- Mount, successful saved-state acknowledgment/load, explicit retry, visible/focus return, or detected
  client New York date change → fresh summary GET. No Things read or task mutation is a side effect.
- Successful finalize may extend/reset current and best; replay recomputes the same saved history.
- Reopen removes that day's qualification; past runs may split and best may decrease. Reopen today
  permits yesterday's grace anchor again. Refinalize uses corrected saved score.
- Unsaved/in-flight/failed day mutation does not change summary data optimistically. A later failed
  refresh reports stale/unavailable independently of the day operation's saved outcome.
- Date navigation changes the daily view only. Current/best retain today's global meaning. Existing
  successful day load may trigger a refresh but never passes the viewed date as an as-of parameter.
- Foreground date checks occur every 30 seconds; request deadline is 15 seconds. On a background-tab
  resume, immediately refresh/check date rather than trusting a timer suspended by the browser.
