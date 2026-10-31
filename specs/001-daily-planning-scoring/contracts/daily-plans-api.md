# Daily Plans API Contract

## Transport and access

JSON under `/api`, same origin in built mode; development Vite proxies to the loopback API.
No public endpoint or credentials. Bind `127.0.0.1`; validate Host and allowed local Origin,
require application/json for mutations, reject cross-origin writes, disable broad CORS.
Dates must be real YYYY-MM-DD values. Responses containing personal plans use no-store caching.

## Endpoints

| Method and path | Input | Success |
| --- | --- | --- |
| GET /api/days/:date | None | 200: DayEnvelope; absent day is virtual revision 0 |
| PUT /api/days/:date | requestId, expectedRevision, tasks | 200: saved editable DayEnvelope |
| POST /api/days/:date/finalize | requestId, expectedRevision | 200: finalized DayEnvelope |
| POST /api/days/:date/reopen | requestId, expectedRevision | 200: editable DayEnvelope |

DayEnvelope contains `plan` (fields in data-model.md) and `result` (all derived fields).
Virtual plans have null createdAt/updatedAt/finalizedAt. The server assigns numeric weights
for newly submitted labels; submitted tasks contain id/title/weightLabel/completed, not totals
or authoritative numeric weights. Preserve weights of unchanged labels on existing IDs;
a deliberate label change assigns that label's current fixed v1 value. No client lifecycle
or score rule overrides are accepted. GET is read-only and never creates an empty record.

Finalize follows the last acknowledged edit revision; client first drains pending saves.
An empty virtual day may be finalized with revision 0. Reopen is valid only for a persisted
finalized day. Finalize on finalized or reopen on editable returns INVALID_STATE, except an
exact successful request replay. Missing-date reopen also returns INVALID_STATE.

## Concurrency and retry

Every mutation includes an expectedRevision and a stable UUID requestId. Retry an uncertain
request with exactly the same operation, date, ID, revision, and payload. Replay lookup occurs
before revision/status checks and returns the original acknowledgement. A subsequent client
edit uses a new requestId and the acknowledged revision. A stale write without a replay receipt
returns REVISION_CONFLICT, never a silent overwrite. Replay may describe an older revision;
the client must not replace a newer local/acknowledged state with it.

## Errors

Error body: `error` with code, user-readable message, optional fieldErrors and currentRevision.

| HTTP | Code | Behavior |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Invalid date/body/title/weight/UUID; no mutation |
| 403 | LOCAL_ACCESS_ONLY | Host/Origin policy rejected; no mutation |
| 409 | REVISION_CONFLICT | Reload deliberately; preserve draft until user resolves |
| 409 | INVALID_STATE | Finalized edit or invalid lifecycle transition |
| 409 | REQUEST_ID_REUSED | Same ID with different operation or payload |
| 413 | PAYLOAD_TOO_LARGE | No truncation or write; retain input |
| 500 | STORAGE_ERROR | Read/write/migration failed; do not report empty/saved |

Network failures have no successful acknowledgement; preserve the in-flight request for exact
retry. A failed GET must not instantiate or autosave a virtual day. Unexpected errors never
include SQL, filesystem paths, or stack traces in the UI. Log diagnostics locally without task
titles or whole plan payloads.

## Planned monthly score read contract — review gate

GET /api/months/:month accepts a valid YYYY-MM month and returns its saved-day projection:
month plus days containing date, status and scorePercent, using the existing scoring rule.
Missing days are absent; empty plans retain null scores. Read only: it must not create records
or change lifecycle. Keep the same local-access, no-store and structured error policies.

Calendar score eligibility requires date <= today in America/New_York, finalized status, and score >0. Otherwise show “No data” with neutral styling and no numeric calendar score. Finalized today is eligible immediately; reopening hides the score until refinalization. Daily Completed/Progress retain live scores regardless of finalization.
The month projection retains raw saved scores/status; the UI applies eligibility without erasing data.
Classification examples are now confirmed in score-colors.md and must not be reinterpreted. Keep raw dates,
state and numeric/null scores distinguishable; client colors follow score-colors.md; never invent records. A read
failure displays calendar Load failed/Retry rather than painting the month as No data.

Calendar eligibility is a presentation filter, not a storage mutation: the monthly projection
may retain raw saved scores/status, but the calendar must not expose ineligible numeric scores
in cells, tooltips or accessible names. A finalized positive score for today is eligible;
unfinalized, future, missing/null and zero results are displayed as No data.
