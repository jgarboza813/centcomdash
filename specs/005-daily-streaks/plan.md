# Implementation Plan: Daily Scoring Streaks

**Branch**: `main` (actual Git branch; logical feature ID `005-daily-streaks`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-daily-streaks/spec.md`

## Summary

Derive current and best streaks from saved day history with a pure domain function using existing
fixed-budget scores and New York calendar dates. Expose one read-only GET /api/streaks endpoint;
share one App-owned client hook between the summary card and sidebar. Refresh from acknowledged
history changes, explicit retry, return to the page and a New York date-change check. Preserve
previous values as explicitly stale after failed refreshes. Add no persisted counters or migrations.

## Technical Context

**Language/Version**: Existing TypeScript 6, Node 24, React 19.

**Primary Dependencies**: Existing Express, better-sqlite3, browser date formatting and fetch; no new dependency, Python change or Things integration work.

**Storage**: Read existing days(date,record) across all history through server today. No new table, schema field, counter or backfill.

**Testing**: Vitest pure calendar/scoring checks, Supertest isolated endpoint/persistence/source-invariance checks, Playwright clock/network/responsive acceptance and rendered review.

**Target Platform**: Existing local browser dashboard; America/New_York calendar; 375px, 800px and 1440px layouts including collapsed rail.

**Project Type**: Existing web application, with a small read-only backend summary and shared frontend state.

**Performance Goals**: Both displays reflect an accepted summary result within one second; foreground midnight detection plus bounded fetch resolves within one minute under normal local operation. UI checks include four-digit counts.

**Constraints**: Finalized score >=85 qualifies; fixed 100-point score remains unchanged. Consecutive calendar days including weekends; today grace only when absent/editable; finalized failing today resets current immediately. Best is derived and may decrease after corrections. No Things access or plan mutations from streak operations.

**Scale/Scope**: One user's entire recorded history, not a displayed-month subset. Current/best/help and loading/error/retry only; no configurable threshold, achievement ledger, repair tokens, charts or notifications.

## Constitution Check

*Pre-research and post-design gates: PASS. No exceptions or unresolved planning questions.*

| Principle | Design evidence |
| --- | --- |
| I. Specify before coding | User-confirmed threshold in spec; tasks and analysis precede implementation. |
| II. Commitment model | Existing result(tasks).scorePercent is reused; no new denominator, rounding or weights. |
| III. Focused MVP | Saved-history feedback supports daily review without new automation or analytics scope. |
| IV. Historical accuracy | Derive from saved records without rewriting them; correction semantics explicit. |
| V. Simple and verified | One pure calculation, read endpoint and shared hook; no cache/counters/migration; boundary and failure checks. |
| VI. Effortless daily use | Consistent card/rail counts, accessible rule/retry, stale vs zero, responsive large-count review. |

## Project Structure

### Documentation (this feature)

```text
specs/005-daily-streaks/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── streak-api.md
    └── streak-ui.md
```

Implementation tasks and executed evidence are in [tasks.md](tasks.md) and [validation.md](validation.md).

### Source Code (repository root)

```text
src/domain/streaks.ts                       # new pure rules and summary types
src/domain/dates.ts                         # existing NY date, new calendar-key shift helper if needed
src/domain/scoring.ts                       # existing fixed-budget result(), reused
src/server/db/daily-plan-store.ts           # all-history projection/summary read
src/server/daily-plan-service.ts            # export read through existing service boundary
src/server/app.ts                           # GET /api/streaks, injected clock
src/client/api/daily-plans.ts               # optional AbortSignal support, existing callers unchanged
src/client/hooks/useStreaks.ts              # new single shared read/refresh lifecycle
src/client/hooks/useDailyPlan.ts            # savedTick also after successful saved-day load
src/client/components/StreakSummary.tsx     # new summary/sidebar presentations from shared state
src/client/App.tsx                          # own one hook, replace both placeholders
src/client/styles.css                      # counts/rail/loading/stale/error/four-digit fit
tests/unit/streaks.test.ts
tests/integration/streaks-api.test.ts
tests/e2e/streaks.spec.ts
```

**Structure Decision**: Keep SQL behind the existing daily-plan-service/store boundary. New domain
calculation knows nothing about SQLite, HTTP, source readers or selected-date UI state. App owns one
streak hook so both presentations share loading/data/error/retry. Do not place this hook inside the
conditionally mounted day/summary branch or instantiate it separately in sidebar and main card.

## Core Design

1. Capture server clock once per request, derive its New York asOfDate with today(clock()), read
   stored day keys <= that date in one ordered SELECT, and validate supported saved records. Reuse
   result(plan.tasks).scorePercent and finalized status. Unsupported/malformed history fails the read
   instead of returning a partial or guessed zero. Do not call readDay per date or crawl Things.
2. Pure calculation sorts a copied projection by calendar key, builds qualifying runs using adjacent
   date keys, and records longest run plus the runs ending today/yesterday. Missing dates break runs.
   Convert date keys to UTC calendar coordinates or shift UTC-noon keys; never subtract 24 elapsed
   hours from a New York instant. Future dates are excluded even in pure-function tests.
3. Current = qualifying run ending today; otherwise, for absent/editable today only, qualifying run
   ending yesterday; otherwise zero. Best = maximum run across all included saved history. Endpoint
   returns counts plus asOfDate, with no history records, source IDs or task data.
4. One useStreaks(savedTick) instance fetches on mount/acknowledged history changes/retry. Reuse
   savedTick after successful load as well as existing successful save/finalize/reopen/sync paths,
   so Reload after conflicts also refreshes. Failed mutations do not optimistically alter counts.
   A replay triggers a fresh derived read, not an increment or a count from an old receipt.
5. Every 30 seconds compare the client's New York day key against its last observed key. Fetch only
   on a changed day. On focus/visibility return, check date and refresh saved history to reflect
   resumed tabs or changes made elsewhere. Keep selected date untouched. No periodic Things calls,
   plan saves or auto-finalization. Foreground checks meet the one-minute target; suspended tabs
   refresh immediately when resumed because browsers may throttle background timers.
6. Use request-generation guards and abort replaced/unmounted requests. Bound individual summary
   reads to 15 seconds using a hook-owned abort deadline; add optional signal support to the existing
   transport without changing its other callers. Explicit retry/future real refresh events can retry;
   do not loop or continuously retry a failed GET. Ignore superseded abort errors/responses. An older
   response cannot overwrite state after a newer successful mutation/refresh or midnight invalidation.
7. Keep prior data during refresh with Updating feedback; after failure mark it stale and expose Retry.
   Initial failure shows unavailable, not zero. Initial loading uses a dash/loading label. asOfDate
   remains attached to loaded values, so yesterday's result cannot silently appear fresh at midnight.
8. Render Current streak + days and Best in the existing summary, with flame accent. Expanded sidebar
   repeats counts; compact rail stacks a flame and current count outside .sidebar-label (which tablet
   CSS hides), with accessible/hover current/best/rule details. Shared help says “Finalize each day
   with at least 85% to build your streak.” Provide keyboard-operable help/retry and review four-digit
   counts in the fixed grid without widening the cards/rail. Streak failure does not disable other UI.

## Validation Strategy

Tests first for threshold 84/85, no data/zero/above 100, both current anchors, finalized failing today,
multiple runs/best decrease and reopen/refinalize/replay. Exercise weekends, month/year/leap-day and
both DST boundaries with injected dates; compare source spy counts and exact stored records before/
after GET. Validate no selected-date/request-asOf influence and no write on summary calculation.

Browser tests combine saved-history fixtures with controlled response order, load failure/stale/retry,
acknowledged reload and midnight/resume clocks. Observe local summary GETs separately from Things
source reads and plan mutation requests. Test all layouts and inspect captures. Default suites use
owned temporary storage/backend 5237 and source fixture 5236; never the real dashboard/source.

## Complexity Tracking

No violations. A derived all-history read is needed because existing monthDays is month-limited;
persisted counters would add correction/replay synchronization without current value. A shared hook
is needed for consistent two-location state, response ordering and midnight refresh, not future scale.
