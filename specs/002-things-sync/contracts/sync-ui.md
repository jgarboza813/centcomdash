# Sync with Things UI Contract

## Trigger and availability

Replace the existing disabled button in the upper-right dashboard header with the sole sync
trigger. Mouse, touch and keyboard activation share one handler. Never invoke from effects,
startup/loading, date selection, autosave, finalization/reopening, focus, timers or source changes.
Failure instructions say to activate this same button again; no separate automatic Retry loop.

For a fresh sync, the button is available only for today's loaded editable plan. On other dates/finalized days,
show a discoverable explanation such as “Sync is available for today's editable plan”. If edits
are pending, the click reserves the day, disables conflicting edits/actions, and awaits flush;
a failed flush prevents the source call and preserves input. During source read/apply show
“Syncing…” with an accessible busy state and prevent repeated/overlapping activation.

Do not add a confirmation or selection preview: new selection is Today's exact ❗ tag and one
weight tag; source completion wins for imported tasks. Ordinary local editing remains available
between syncs. Show a linked-task indicator with “Things controls completion on sync”.

## Results and failures

Success shows added, updated and unresolved counts, successful time and a no-changes message
when appropriate. Missing/conflicting weight items are skipped and named in a concise unresolved
list so tags can be corrected in Things. Preserve manual tasks and weights of existing links.
Expose result text through a polite status region, errors through alert text and accessible
instructions. Colors alone never convey outcome.

No source read failure becomes a blank successful import or a zero score. Show distinct
service-unavailable, authentication, database-access, timeout, incompatible-source and
save/conflict messages; retain the
last successful time. Authentication failure guidance refers to server-side service token configuration; unavailable
service guidance refers to starting the pinned local service. Never request a Things URL write
token, show the service token in the UI or automatically alter OS/network/service settings.

On success, update the captured date's cached envelope, task linkage, score and save state,
and invalidate month data as appropriate. Date navigation remains possible: a late response
cannot overwrite the newly selected date. Reopened historical dates remain protected by the
feature's today-only action rule; this feature introduces no past-day backfill.

## Responsive and reference behavior

Preserve header placement and dark visual design at 1440px. The current mobile CSS hides the
disabled Things action; this feature must make it visible and keyboard-operable at 375px,
using a compact wrapped header action row rather than retaining display:none. Do not hide
the sole trigger in a way that prevents mobile/touch access. Maintain focus after completion
and announce outcome without opening a blocking modal. Keep existing lifecycle actions.

## Explicit recovery exception

An outstanding uncertain operation keeps the same Sync with Things button enabled for receipt
recovery on its original date, even after midnight or finalization. Its accessible description
explains that it checks the previous result without reading Things. The next click calls only
things-sync/recover with the original ID/revision; it never drains drafts into a new source sync.
Show still-running or not-committed explicitly; no automatic polling, recovery or fresh retry.
Only a later click on an eligible today/editable day may start a new sync. Existing receipt
results cannot replace a newer acknowledged day revision or discard unsaved drafts. If the user
navigates away, retain the per-date recovery context; never change the selected date implicitly.

## Today and This Evening scope

“Today” source membership includes both Things Today and its This Evening section. The pinned
things-api /today endpoint returns both; no separate evening endpoint or bucket exclusion is used.
Both sections use the same ❗ marker, weight rules, identity and completion reconciliation. The
synthetic pinned-library check in tools/things-api/verify_reader.py verifies both source buckets;
reader and browser fixtures cover evening import through the normal explicit button action.
