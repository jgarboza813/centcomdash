# Column sorting validation

Implementation started 2026-11-14.

Pre-implementation consistency review: all FR-001–013 and SC-001–005 map to the 13 tasks; no constitutional conflict.
Checklist: 16 checked, zero unchecked. Existing test backend uses 5237 and owned temporary storage; real dashboard/source excluded.
Implementation decision: key PlanTable by date and finalized/editable status, resetting its local edit capture on navigation/lifecycle
changes. This is the plan's permitted local-edit-ending path; App sort state and useDailyPlan drafts persist independently.
No extension hooks are configured. Required test results will be recorded after execution.

## Initial evidence

Pure tests first failed for the absent helper, then passed all six orders, stable English numeric
case/accent ties, null order, input nonmutation and frozen-ID reconciliation. Browser acceptance
first failed because sortable headers did not yet exist. After implementation, six-order/reset
acceptance compares exact saved envelopes and observes zero mutation requests/source reads;
finalized views remain unchanged. Sorting uses an ordered copy, not the edit/save array.

Seven sorting browser scenarios passed before the final full-regression run. They cover visible
frozen editing with add/remove/rename/reweight, original saved order, same-identity checkbox focus,
date navigation/unmount selection retention, keyboard direction/reset focus, empty/single/100-task
cases, explicit sync/failure/receipt recovery and draft preservation through failed saves.
One fixture expectation was corrected: full page reload returns to today (existing app behavior),
so the historical date must be selected again to verify sort reset. No production behavior changed
to satisfy that assertion.

Implementation refinement: App keys the table by date and editable/finalized status. This explicitly
ends local edit capture on navigation/finalization, while page sort and the hook's per-date drafts
remain. Snapshot reconciliation records newly encountered IDs before paint and drops removed IDs.
Scoped checkbox-origin restoration retains focus on row movement without focusing unrelated sync
results or another date.

## Final results and rendered review

- Unit/API: 66 passed across seven files, including three new pure helper scenarios and all
  existing scoring/sync/persistence cases.
- Browser: all 28 scenarios passed in a full run, including seven new sorting scenarios.
- Typecheck, ESLint, production build and diff whitespace checks passed.
- The 100-task acceptance checked visible first-row order within one second of activation.
- Inspected 375px and 1440px captures; 800px capture/geometry checks also passed. Long title
  and 90-character source category remain within the Task column. Full header labels and
  below-label neutral/directional icons remain visible, with keyboard focus outlines and
  reset/edit actions fitting without horizontal overflow. Captures: artifacts/task-sorting/.
- Header roles/aria-sort and native keyboard interaction were exercised in Chrome. No claim
  is made of testing every screen-reader/browser combination.

Coverage: FR-001–006/SC-001 verified six orders, first-direction transitions, stable ties and
reset. FR-007/SC-002 verified exact saved envelopes and zero sort-triggered writes/source
reads, also on finalized days. FR-008–010/SC-005 verified navigation/reload, same-identity
focus, frozen edits/add/remove and original saved order, source failure, receipt-only recovery
and failed-save drafts. FR-011–013/SC-003–004 verified keyboard/reset focus, semantic state,
responsive rendering, empty/single tasks and 100-task timing. Existing lifecycle/category
regressions passed after the table-role adaptation.

No personal Things reads or actual-dashboard mutations were performed for this feature.
No schema/API/dependency changes. All 13 implementation tasks are complete. Changes are
uncommitted; build assets are available through the existing local dashboard server.

## Inline header follow-up

Updated the presentation per user review: active-only direction arrow inline, no inactive
sort glyphs, Weight/Status icons with hover text and stable accessible names. Build passed;
six-order/reset and keyboard/responsive browser scenarios both passed. They verify no
indicators before sorting, exactly one while sorted, correct hover titles and no overflow
at 375/800/1440px. Revised mobile capture inspected after the change.
