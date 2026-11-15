# Daily streaks validation

Validated 2026-11-14 with Node 24, Chrome/Playwright and owned fixture storage. No personal
history or live Things data was used. The requirements checklist remained read-only.

## Behavior and authority

- Finalized saved score >=85 qualifies using existing assigned task points / fixed 100-point budget.
  Boundary fixtures null/0/84 → 0, 85/95/100/120 → 1; editable 90 never qualifies.
- Adjacent New York date keys include weekends, month/year boundaries, leap day and spring/fall DST.
  Injected 04:59:59Z/05:00:00Z instants select the correct November New York date.
- Current uses qualifying today, or yesterday only when today is absent/editable. A finalized failing
  today resets immediately. Missing/nonqualifying past days break runs; future rows are excluded.
- Separate runs of 3/7/current 2 return 2/7. Reopening the middle of the seven-day run reduces best
  to 3. The API correction/reopen/replay sequence returns 0/2 → 2/2 → 2/2 → 3/3 → 3/3;
  deliberately reopening yesterday then returns 1/1. Replays add no day.
- GET uses one ordered SELECT over existing saved rows through a single captured server date.
  Exact days/receipts/links/sync-state snapshots are unchanged by reads. No migration, counter,
  metadata backfill or source read was added. ThingsReader spy remains at zero.
- Unsupported rule/schema, mismatched dates, malformed JSON/status/tasks/score inputs, overflowing
  scores and unavailable storage return structured 500 STORAGE_ERROR without partial counts.
  Unexpected query parameters return 400; local Host/Origin protection and no-store are verified.

## Browser acceptance

- One App-owned hook drives both displays. Saved finalize/reopen updates both within the one-second
  assertion; history browsing keeps global-today meaning. Failed saves/finalization and unsaved
  qualifying-looking drafts retain saved-history counts. Retry and conflict Reload saved day refresh
  from current stored truth after an external fixture correction.
- Lifecycle revision conflicts now expose Reload saved day, matching existing save-conflict recovery.
  The existing discard confirmation is retained and accepted explicitly by the fixture.
- A delayed initial read cannot overwrite a newer successful-load acknowledgment. A delayed pre-midnight
  read is aborted/superseded by the next date read before its deadline; releasing it cannot overwrite
  the accepted new-date result. Superseded errors do not flash a failure.
- Controlled foreground midnight produces one additional GET at the next 30-second check. Another
  90 seconds on the unchanged date produces zero GETs. Paired focus/visibility events produce one GET.
  Selected date stays fixed; request capture proves zero plan writes and source metrics stay at zero.
- A hidden-page fixture advances 90 seconds across midnight with zero extra GETs, then visible/focus
  resume produces one immediate GET. Unmount aborts a pending read; advancing a full day and dispatching
  resume afterward produces no requests. All timers/listeners are removed.
- Initial loading visibly says Loading streak with a dash. Initial failure/malformed responses visibly
  say Unavailable, never zero. Genuine zero is 0 days. Refresh preserves counts with Updating, then
  Stale on failure. Details retain as-of date/error. Explicit keyboard Retry restores fresh data.
- A held read times out after 15 seconds (checked at 15.1 seconds). Another 120 seconds produces no
  automatic retry requests. Background timer precision is not promised; resume triggers a fresh read.
- 375/800/1440px captures exercise 0/1/999/1000 counts, keyboard rule help, mobile drawer, compact rail,
  stale/retry and unavailable. Overflow assertions cover cards, rail and document. Four-card desktop/
  tablet and two-column mobile composition, task sorting and weight/score colors remain intact.

## Checks and rendered review

- Domain test failure was observed before implementation (missing module); endpoint tests initially
  failed 404 before adding the route. Browser checks exposed a lifecycle recovery issue and narrow
  stale-line overflow; both were fixed and retested.
- `npm test`: **90 passed**, 9 files (including 11 domain and 13 streak API cases).
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- Full browser regression: **36 passed** (48.0 seconds); includes all existing planning, sync, category and sorting cases.
- After the final sidebar presentation adjustment: all **8 streak browser cases passed** again (14.4 seconds), followed by passing typecheck/lint/build.
- Rendered captures are in ignored `artifacts/streaks/`, including keyboard focus/help, sidebar,
  stale and unavailable at each width. Reviewed mobile loading/error and tablet stale/help fit;
  expanded sidebar was adjusted to give Current streak and Best their own lines without repeating the count. Final desktop and mobile drawer captures were inspected and show readable four-digit values, help and stale/retry without clipping.

## Coverage

| Requirements | Evidence |
| --- | --- |
| FR-001–004; SC-001–002 | Pure threshold/anchor/gap/calendar/multiple-run cases; global all-history API |
| FR-005–006; SC-003 | Saved acknowledgment, failed save/finalize, reopen/correction/replay and exact row comparisons |
| FR-007–009; SC-004 | Shared summary/sidebar, historical navigation, keyboard rule help and responsive counts |
| FR-010; SC-005 | Reload, controlled midnight, response races, hidden resume and unmount; zero writes/source reads |
| FR-011; SC-006 | Visible initial loading/unavailable, retained stale counts/as-of, deadline and keyboard retry |
| FR-012–013 | Source spy/DB invariance plus full planning/sync/category/sorting regression and responsive captures |

## Limits

These are synthetic fixture results, not a verification of personal historical records. Chrome keyboard
and rendered accessibility were checked; VoiceOver/NVDA and other browser/assistive-technology combinations
were not manually tested. Another tab's correction appears on return/retry; no cross-tab push was added.
Foreground checks and request deadlines are bounded, while browser-suspended background timers are not.
