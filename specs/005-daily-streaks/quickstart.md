# Quickstart Validation: Daily Scoring Streaks

Acceptance guide. Actual execution evidence is recorded in [validation.md](validation.md). Use existing Node 24 dependencies and the
[model](data-model.md), [API contract](contracts/streak-api.md) and [UI contract](contracts/streak-ui.md).
No live Things compatibility probe or Python changes are needed for this feature.

## Validation commands

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Use owned temporary databases/injected clocks for integration tests, backend 5237 and source fixture
5236 for browser tests. Default tests must never touch the actual dashboard 3001, personal history or
Things 5225. Compare exact fixture database rows before/after GET /api/streaks to prove read-only behavior.

## Pure rule scenarios

1. Empty history → current=best=0. Finalized 84 fails, 85 qualifies, 95/100/120 qualify, editable 90
   does not qualify. Empty/null and zero fail; planned capacity and completed/planned ratio are irrelevant.
2. Three qualifying days through yesterday plus absent/editable today → current=3, best=3. Finalize
   today at 87 → 4/4. Finalize today below 85 → current=0 while prior best remains. Reopen today →
   yesterday's grace run is current again; corrected qualifying refinalization extends it.
3. Separate runs of 3 and 7 with current run 2 → current=2,best=7. Reopen a day in the seven-day
   run and verify best recalculates from remaining saved truth; repeat/refinalize without double count.
4. Missing/editable/nonqualifying yesterday breaks current while an older run still contributes to best.
   Future records never contribute. Input order does not matter and inputs remain unchanged.
5. Runs cross weekends, month/year boundaries, 2024-02-29 and New York spring/fall DST dates. Count
   adjacent date keys exactly once. Use injected instant values on both sides of New York midnight,
   not the host timezone. Include foreground/resume behavior separately from pure date tests.

## API and history invariance

- Seed owned days; GET /api/streaks returns exact counts/asOfDate with local/no-store protection.
  Inject a clock crossing New York midnight and verify one captured as-of value per request.
- Unexpected caller date/query input is rejected and cannot inspect arbitrary historical-as-of views.
- Spy on ThingsReader: zero calls for streak reads. Compare day JSON, links, state, receipts/revisions
  before/after; there is no mutation, migration or backfill.
- Corrupt/unsupported selected history or storage read failure yields structured failure, never partial
  counts or zero. Normal empty history still returns a successful 0/0 response.
- Finalize/reopen/correct through normal fixture endpoints; verify recomputed counts and unchanged
  other records. Replay the same operation and compare results without incrementing counters.

## Browser acceptance

1. Summary and sidebar agree after mount, successful finalize/reopen and explicit Reload saved day.
   Browse history/months: current/best still mean today globally. Keep the selected date unchanged.
2. Make a qualifying-looking draft with unsaved edits or a failed mutation. Counts do not extend
   before successful saved finalization. After read failure, show unavailable or explicitly stale
   values independently of whether the saved mutation itself succeeded; retry restores fresh data.
3. Delay an earlier summary response, then finalize/refetch successfully. Release the older response
   and verify it cannot replace new data/error state. Repeat around midnight and with explicit retry.
4. Advance controlled client/server clocks across New York midnight while visible: observe local GET
   refresh within one minute, zero Things reads/plan writes, and no selected-date change. Simulate
   background suspension/resume separately; visibility/focus causes immediate refresh without duplicates.
   Verify unchanged-date interval ticks cause no extra GET, and unmount cancels timer/listeners/reads.
5. Exercise timeout, initial/mid-refresh failure and malformed count/date responses. Retry remains
   keyboard operable; planning/sorting/Things Sync and lifecycle controls still work.
6. At 375px, 800px and 1440px inspect 0,1,999,1000 values, help and stale/retry states. Open the mobile
   drawer and compare values. Compact rail count remains visible outside hidden labels. Capture
   artifacts/streaks/ and inspect rendered appearance, keyboard focus and accessible names/help.

Record actual results and remaining limitations in validation.md during implementation. No real-data
walkthrough is required to satisfy this feature's pure saved-history and fixture-based acceptance.


## Verified implementation

The application uses the rules and refresh lifecycle above. Completed fixture results, responsive
captures, exact source/storage invariance evidence and assistive-technology limitations are recorded
in [validation.md](validation.md). Streaks are global through server today even while browsing history.
Successful reloads refresh current stored truth; replay never increments a counter. A historical
correction may reduce best. There are no new settings, source reads or persisted streak fields.
