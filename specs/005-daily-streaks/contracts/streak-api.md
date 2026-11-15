# Streak Summary API Contract

## GET /api/streaks

Read-only local endpoint; no body or as-of/date selector. Return the global current/best summary
through the server's current New York date, independently of the viewed day/month.

```json
{"asOfDate":"2026-11-14","current":3,"best":7}
```

Counts are nonnegative integers; best >=current. Capture options.clock (or default clock) once at
request entry and use existing today(capturedInstant). Do not mix dates if midnight passes during
reading/serialization. Inherit existing Host/Origin local-access checks and Cache-Control: no-store.
No authentication/source token or task/project/history payload is introduced. No Things access.

## Service/store boundary

Expose readStreakSummary(db, asOfDate) through src/server/daily-plan-service.ts. Store reads all saved
keys <=asOfDate in one ordered SELECT and validates supported record/scoring shape. Calculate existing
result(tasks).scorePercent from assigned saved weights and map to the pure domain input. No calls to
ThingsReader, per-day HTTP reads, schema migration, materialized counter or database writes.

Pure derivation excludes future dates even when directly tested with an unfiltered projection.
Missing/nonqualifying dates break runs. Current uses qualifying today first, otherwise yesterday only
when today is absent/editable; a finalized failing today returns 0. Best spans all included history,
including weekends/leap dates/month/year and DST boundaries. No rounding or score-color inference.

## Failure and invariance

Storage or unsupported/malformed selected history returns existing structured 500 STORAGE_ERROR
without a partial summary or a guessed zero. Local-access rejection retains existing 403 response.
Clients validate date/count shape; malformed data is a streak-read error. Errors reveal no personal
row content. Summary requests never create receipts or change revisions/timestamps/tasks/history.

Replayed finalize/reopen/sync responses remain immutable. A client refresh reads current stored history
rather than counts embedded in an old receipt. Tests compare exact days/links/state/receipt rows and
source spy counts before/after reads and invalid-date-selection attempts. Caller date parameters must
not influence asOfDate; either reject them as validation errors or ignore them consistently (selected
implementation: reject unexpected query parameters with VALIDATION_ERROR).

The endpoint adds no cross-tab push mechanism. The current page refreshes after its acknowledgments,
manual retry and return-to-page events; another tab's corrections become visible on retry/focus/visibility
refresh. No guarantee of continuous cross-tab push while both tabs remain untouched is introduced.
