# Sync API Contract

## Start operation

POST /api/days/:date/things-sync

JSON body: requestId (UUID) and expectedRevision (nonnegative integer). No task/source payload,
service URL/token, source IDs or filter parameters are browser-controlled. Inherit loopback Host/
Origin checks, JSON-only mutations, no-store response headers and the existing payload bound.

Only today in America/New_York is supported for this action, and only while editable. Read
receipt first: exact successful replay returns the saved response without source access, even
if the date/lifecycle has since changed. Otherwise reject date/lifecycle/stale revision before
calling Things. A second request during a day's active operation gets SYNC_IN_PROGRESS;
it does not run a parallel adapter, queue a future read or automatically retry.

Success 200: `{day: DayEnvelope, sync: {requestId, targetDate, completedAt, addedCount,
updatedCount, unresolvedCount, unresolved: [{sourceId, title?, reason}]}}`.
Reasons include missing-weight, conflicting-weights, missing-source, canceled, trashed,
rescheduled and unsupported-source-state. A source task reported as rescheduled but readable
open still follows Things-authoritative incomplete status; missing/canceled/trashed keep their
previous completion. Counts refer to unique entries; no-op success is explicit.

All accepted changes, new links, timestamp/count metadata and mutation receipt commit together.
Recheck today/revision/lifecycle immediately before writing. If midnight or another tab's edit
intervenes, return conflict without applying changes. The source is not read under a database
transaction. Last successful time is the commit time and remains unchanged on failure.

## Error contract

Use existing `{error: {code, message}}` format, without source contents or stack traces.

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Invalid date/body/revision/ID |
| 403 | LOCAL_ACCESS_ONLY | Existing local-access rule |
| 409 | INVALID_STATE | Day finalized |
| 409 | THINGS_DATE_MISMATCH | Source Today timezone alignment is unknown/mismatched |
| 409 | SYNC_NOT_COMMITTED | Recovery found no committed receipt or active operation |
| 409 | WRONG_SYNC_DATE | Selected/target date is not today, including midnight rollover |
| 409 | REVISION_CONFLICT | Day changed after request or while source was being read |
| 409 | SYNC_IN_PROGRESS | Another operation is active for this date |
| 409 | REQUEST_ID_REUSED | Existing ID has different target/action/body |
| 503 | THINGS_UNAVAILABLE | Local service unavailable or Things database unreadable |
| 403 | THINGS_AUTHENTICATION_FAILED | Local service rejected its bearer token |
| 504 | THINGS_TIMEOUT | Deadline reached |
| 502 | THINGS_INCOMPATIBLE | Required service response/schema behavior unavailable |
| 502 | THINGS_READ_FAILED | Failed/malformed/partial/oversized source result |
| 500 | STORAGE_ERROR | Atomic apply/metadata/receipt persistence failed |

No error response schedules a retry. An uncertain response retains the same request ID/body
for the next explicit button click. A committed receipt wins over later source changes; a
fresh button operation after acknowledged success uses a new ID to read fresh state.
Definite failure may use a new request ID on the next click. IDs never change automatically
while retrying an uncertain request.

## Read-only existing endpoints

GET /api/days/:date may return persisted links/last-success metadata, but never queries Things.
GET /api/months/:month remains derived from saved plans and never syncs. Legacy receipt
responses without new metadata remain readable. Ordinary PUT preserves server-owned source
links for retained task IDs; browsers cannot forge links. Finalize/reopen still trigger no sync.

## Recovery of an uncertain response

POST /api/days/:date/things-sync/recover accepts the original requestId/expectedRevision only.
It is a receipt lookup, not a sync: no source calls, plan writes or eligibility checks that
would reject a saved response because the date became past or the day was finalized.
Validate the original sync action/date/body fingerprint. Matching receipt returns its original
{day,sync}; a mismatched fingerprint returns REQUEST_ID_REUSED. If the operation remains active,
return SYNC_IN_PROGRESS; if no receipt/active operation exists, return SYNC_NOT_COMMITTED (409).
Never fall through from recovery into a fresh source read.

After an uncertain network response, the next explicit activation of the same header button
uses this endpoint. No recovery occurs automatically on reload/focus/timers. A new source sync
requires a subsequent explicit activation, a new ID and today's editable eligibility. Receipt
replay on the original POST remains receipt-first too; recovery gives the UI a guaranteed
read-free path. A replayed older envelope must not replace a newer acknowledged revision;
ordinary local GET may refresh the current day without contacting Things.
