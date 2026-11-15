# Streak Presentation and Refresh Contract

## Shared source of truth

App invokes useStreaks(savedTick) once above selected-day conditional rendering. Feed its same
accepted data/phase/error/retry to summary and sidebar. The selected date is not a hook input and
cannot change the as-of meaning. Use successful savedTick after day load as well as existing save,
finalize/reopen and explicit sync/recovery acknowledgments; no draft-derived counters.

Mount/refresh GET /api/streaks only. A 30-second timer compares New York day keys and invalidates on
change; do not GET every timer tick when date is unchanged. Check/refresh when the page returns to
visible/focused state, deduplicating the paired focus/visibility events and concurrent same-invalidation
requests. Keep selected date and day-edit state untouched. Cancel superseded reads and ignore old
results/errors with a request generation guard. Hook-owned request deadline: 15 seconds. Retry is
explicit, with no automatic retry loop; later real acknowledgment/date/resume events may start a read.

Foreground midnight refresh must occur within one minute under normal local service operation.
Browsers may suspend background timers; resume triggers an immediate check/read. A failed/timed-out
refresh still updates stale/error feedback within that bound rather than pretending old data is fresh.
Server asOfDate supplies the result date; the client day check is only a refresh trigger.

## Summary card

Replace Coming later with a Current streak heading, primary current count/day(s), flame accent and
Best: N day(s) detail. Keep compact card layout and count sizing that fits at least four digits. Make
“Finalize each day with at least 85% to build your streak.” available through keyboard-operable help
and an accessible description; hover alone is insufficient. When a historical day is selected, the
Current streak heading/help still makes its global-today meaning clear. No invented mini chart.

## Sidebar

Expanded sidebar shows current and best with day units. Compact 76px rail stacks flame/current count,
keeping that count outside the hidden .sidebar-label selector. Hover/accessibility text communicates
current, best and qualification rule; keyboard-accessible help exposes the same content. Mobile drawer
uses expanded presentation. Counts and all loading/stale/error states must agree with the main card.
Use distinct per-instance help IDs if components render twice; do not create duplicate DOM IDs.

## Loading/error/retry

- Initial loading: dash/Loading streak, never a zero before successful data.
- Ready zero: show 0 days and Best: 0 days as genuine values.
- Refreshing: last accepted values may remain, with Updating feedback.
- No successful data and read failure: Streak unavailable plus an enabled Retry streaks action.
- Last accepted data and refresh failure: explicitly mark values Stale, retaining asOfDate in help
  and offering retry. Do not imply that a failed refresh means a failed finalize/reopen commit.
- Retry/help remain reachable by keyboard in all layouts. Compact retry can be a labeled icon; its
  accessible name and help must identify stale/unavailable status. Avoid competing duplicate live
  announcements from both presentations; share a single status announcement if adding live feedback.
- Streak errors never disable unrelated table controls, sorting, sync, date selection or lifecycle buttons.

## Clock and response ordering acceptance

Test a delayed pre-finalize read completing after a newer post-finalize read: old data/error must not
replace the newer result. Test the same at midnight, including a previous-date asOfDate response.
Test cleanup on unmount and explicit retry after abort/timeout; superseded aborts must not flash an error.
After save/reopen/receipt replay, compare both displays to a fresh stored-history result, not the receipt.

## Layout invariants

At 375px, 800px and 1440px, verify current/best 0, 1, 999 and 1000, expanded drawer and compact rail,
help, stale markers and retry. Preserve four summary cards at tablet/desktop, two mobile columns,
existing task sorting and all weight/score colors. No horizontal overflow, clipped counts or hidden rail
current count. Status labels and numeric text communicate state without relying on color or flame.


Implementation uses a wrapping detail line for stale/retry feedback at narrow widths. Expanded sidebar
places the current count/day units above the Current streak and Best lines; the compact rail retains
the count outside hidden labels. See [executed validation](../validation.md) for acceptance evidence.
