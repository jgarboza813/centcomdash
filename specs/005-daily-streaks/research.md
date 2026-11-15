# Research: Daily Scoring Streaks

Researched 2026-11-14 using current repository code. No personal saved history or Things data read.

## 1. Derive counts from saved history, not event increments

**Decision**: Pure src/domain/streaks.ts consumes saved-day score/status/date projections and an
explicit New York asOfDate. Store read uses existing result(tasks).scorePercent; return current/best
counts rather than writing a ledger/counter. No migration, backfill or mutable achievement record.

**Evidence/rationale**: result() sums assigned completed points without capping/normalizing and returns
null for an empty plan. Daily saved aggregates already contain assigned weights and finalized status.
Existing finalize/reopen receipts can replay; increment-on-success would double count. Reopening/correcting
a historical record must split runs and can lower best, making derived history simpler and authoritative.

**Alternatives considered**: Persist counters (requires synchronization/rebuild on every correction and
replay); use monthDays only (misses cross-month runs/all-time best); use live draft score (counts unfinished
work); query Things (not the saved scoring authority and violates source trigger rules).

## 2. Use New York date keys and one server as-of value

**Decision**: Read the injected clock once in the endpoint and use existing today() for America/New_York.
Calendar adjacency uses YYYY-MM-DD keys with UTC calendar arithmetic, not elapsed local hours. Future
records are excluded. Pure function explicitly implements today-qualified/yesterday-grace/failing-today.

**Evidence/rationale**: src/domain/dates.ts already derives New York date via Intl formatting; month
navigation uses UTC calendar operations. New York DST days are not always 24 hours, so an elapsed-hour
streak rule is inappropriate. Existing finalized calendar rules also exclude future dates, but the streak
threshold is independently >=85 and must not be inferred from color or planned-work completion ratio.

**Alternatives considered**: Host-local midnight (server timezone may differ); fixed millisecond gaps
across New York instants (wrong DST semantics); client-supplied asOf (breaks one current global result).

## 3. Add a minimal read boundary

**Decision**: GET /api/streaks captures server date, then calls readStreakSummary exported from
src/server/daily-plan-service.ts and implemented with store access. One SELECT through server today
projects existing saved records, validates supported shape and computes existing scores. Return only
{asOfDate,current,best}; errors use existing local-only/no-store/error middleware.

**Evidence/rationale**: daily-plan-service.ts currently re-exports store operations, preserving a route/SQL
boundary. app.ts already injects clock for sync and blocks public Host/Origin. monthDays currently reads
only a selected month; a separate small all-history summary avoids sending personal task bodies to the
browser and avoids mixing view-date filtering with global streaks.

**Alternatives considered**: Add SQL directly to App/routes (bypasses current boundary); attach streak
state to stored/replayed day envelopes (risks stale receipt values/global-as-of confusion); per-month
requests in browser (unnecessary round trips and inconsistent partial state).

## 4. Reuse acknowledgment events, including explicit saved-day reload

**Decision**: Own one useStreaks hook in App. Use existing savedTick and increment that signal after a
successful useDailyPlan.load as well. The summary GET recomputes from current stored truth after each
successful acknowledgment; no optimistic increments. Date browsing doesn't change the summary's scope.

**Evidence/rationale**: Existing flush/transition/sync success paths call saved(), including receipt
replay, but load() currently updates acknowledgment without incrementing savedTick. Without covering
successful Reload saved day, an external correction/conflict reload could leave streaks stale. The same
signal already refreshes calendar; refreshing it after acknowledged load also reflects saved truth there.
Independent research-agent review confirmed these paths and the existing service facade.

**Alternatives considered**: Separate feature-specific history event bus (unnecessary); derive from selected
entry only (cannot know all-time history); compute from a replay receipt (might describe an older revision).

## 5. Bound refresh and preserve stale/error distinctions

**Decision**: Generation-guarded/abortable summary fetches on mount, savedTick, explicit retry and focus/
visibility return; a 30-second timer checks New York date and reads only when it changed. A 15-second
request deadline leaves room inside the one-minute foreground rollover target. Superseded requests are
ignored, not shown as failures. No retry loop or Things read is scheduled. Timer/events clean up on unmount.

**Rationale**: Multiple acknowledgment events can overlap, including flush before finalization. Last-started
request wins; an earlier read must not overwrite the corrected result. Browsers can suspend background
timers, so an immediate resume check complements foreground rollover checks. Prior values remain visible
while refreshing and explicitly stale after failure; initial failure never masquerades as zero.

**Alternatives considered**: Refresh only on mutation (misses midnight/reload); poll source (wrong authority);
GET every 30 seconds regardless of date (unnecessary regular traffic); optimistic UI counts (unsafe);
count stale data as fresh (misleading); require background timer precision (not under application control).

## 6. Share presentation state and retain count in collapsed rail

**Decision**: Feed one hook result into summary/sidebar presentations. Put compact rail count outside
.sidebar-label, show current/best/rule via accessible help/title, and allow a visible stale marker/retry.
Adjust placeholder-specific .metric-streak p grid placement so Best gets a detail row and the current
count remains primary, with responsive numeric sizing for four digits.

**Evidence/rationale**: Tablet CSS hides .sidebar-label and existing streak placeholders contain no real
count. Separate hooks could disagree during loading/errors; shared state prevents that. Existing summary
cards have compact fixed grid columns, so long counts need deliberate rendered review.

**Alternatives considered**: Hide count with existing sidebar-label (fails compact-rail requirement);
separate fetches per location (duplicated requests and inconsistent states); let card width grow (breaks
four-card summary row); display guessed zero while loading (confuses unavailable with no streak).

## Resolution

All design unknowns have decisions. No dependency choice or live-source compatibility work is needed.
User-confirmed >=85 finalized rule is retained. Foreground rollover timing and resume behavior are
explicit; background suspension is handled on return rather than promising impossible timer precision.
