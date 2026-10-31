# Quickstart Validation Guide

This is the validation procedure for the future implementation. No application or npm scripts
exist yet; the commands below are the implementation's required script contract.

## Prerequisites and setup

1. Activate Node 24 LTS with your existing version manager; confirm `node --version` reports
   v24.x. The detected v16.19.0 must be replaced for this project before dependency installation.
2. Once implementation supplies package.json and the lockfile, run:

```sh
npm ci
npx playwright install chromium
npm run dev
```

`npm run dev` must start loopback API port 3001 and Vite port 5173 with strict ports and an API
proxy. Open http://127.0.0.1:5173. API uses `data/central-command.sqlite` by default. No login,
external service, or environment secret is needed. Do not expose these servers to the network.

## Required automated checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm start
```

`npm test` runs unit/integration tests once; E2E starts isolated test servers with a temporary
database, never the default user database. Built start serves client/API at loopback port 3001.
Inspect the built app too. Scripts, ports, runtime pinning and test fixtures are implementation
deliverables rather than changes made by this document.

## End-to-end acceptance walkthrough

1. Open a clean date: 0% allocation, 100% remaining, 0 of 0, “No plan”.
2. Enter 3 XL, 2 L, 3 M, 1 S tasks within three minutes: 96%, 4% remaining, no overload warning.
3. Complete one XL and one M: 25 completed points, 2 of 9, score 25%. Undo M: 20%, 1 of 9.
4. Complete three XL and two L instead: 80 points and score 80%. Complete all: score 96%.
5. Add/complete another M: 101 planned/completed, 1 excess, score 101%. Test a separate
   six-XL plan: 120 planned, 20 excess, all done scores 120%.
6. Rename/reweight/delete a completed entry: totals and counts follow remaining preserved
   weights. Equal-title tasks remain independent. Blank titles/missing weights fail clearly.
7. Wait for Saved; reload, close/reopen browser, then restart the server. Each step preserves
   the date, identities, titles, weights, completion and results.
8. Finalize at 96 planned/80 done: read-only, score 80%, no automatic completion. Try a direct
   mutation against finalized data: 409 INVALID_STATE, no record change.
9. Reopen explicitly; complete one M: score 85%. Refinalize and reopen for review. Test empty
   finalization: read-only, score “No plan”. Other dates remain unchanged.
10. Advance the test clock across New York midnight: selected date and editable state unchanged.
    Today opens the new local date without moving tasks.
11. At 375px and 1440px, finish the core flow using only keyboard. Inspect focus, long titles,
    contrast, status text, and loading/error presentation. No horizontal page scroll or overlap.

## Failure and integrity validation

- Abort a save transaction in a temporary test database: last confirmed aggregate/revision
  unchanged; no success receipt; Retry keeps IDs and input and saves once.
- Simulate a committed write whose response is lost: retry the exact request; one revision
  increment and original acknowledgement, no duplicate task. Restart server before retry too.
- Fail a load: explicit Load failed/Retry, no empty-day autosave or overwrite.
- Fail finalize/reopen persistence: unchanged confirmed lifecycle, visible error, safe retry.
- Open two tabs at the same revision: save one, then save stale second; visible conflict,
  first record preserved, second draft retained until deliberate reload/discard.
- Delay a save while making another edit or switching date: the newest draft is retained,
  the eventual saved state includes it, and late responses cannot replace a different day.
- Load 100 tasks and time completion/weight changes: visible totals update within one second.
- Reopen a prior-schema temporary database after migration and compare all preserved values;
  a migration failure rolls back and refuses writes instead of resetting data.

Use database/service test fixtures and Playwright request failure controls; do not introduce
failure switches into the normal product UI. Reference [API](contracts/daily-plans-api.md),
[UI](contracts/daily-dashboard.md), and [model](data-model.md) for precise expectations.

## Data handling during validation

Keep runtime data, SQLite sidecars, node_modules, build output and test artifacts out of Git.
Stop the server before copying a user database for backup. Automated tests create/dispose only
explicitly owned temporary databases. Do not delete or reset the actual user's history.

## Visual-reference acceptance review

Use the conversation image and [design-reference.md](design-reference.md) alongside the
[UI contract](contracts/daily-dashboard.md). Capture the implementation at 1440px and 375px.
At desktop width check sidebar/brand, greeting/date and upper-right actions, four cards,
plan table, right-hand Progress/Category/horizontal Guide/Notes/Insights stack and lower-left
Timeline/Calendar pair. At mobile width check collapsed navigation,
stacked panels and usable task controls. Check long titles and visible keyboard focus.

Enter the consistent 96-point fixture, complete three XL and two L tasks, and confirm both
Completed and Today's Progress display 80% and 80 / 100. The plan footer remains 96 / 100,
4% remaining. Do not reproduce the mockup's incompatible task values or 60 / 96 denominator.
Verify Edit Plan/Done, Add task form, direct status toggles, and the day-actions lifecycle menu.

Confirm every future capability is visibly labeled: Things action and deferred sidebar
entries are unavailable; streak, category, timeline, notes and Insights areas show no made-up metrics,
graphs, times or active editors. History still opens a saved date in the current daily page.
Check the guide describes 20/10/5/1 percent capacity commitments rather than duration/effort.
Record visual differences only where explicitly permitted by the contract, not as silent
substitutions. These checks are planned, not claims of rendered implementation validation.

## Historical-score calendar and shared-color validation

Use contracts/score-colors.md for confirmed boundaries across every score component, including
above-100, genuine zero, No plan, missing, editable and finalized days. Verify a correctly
aligned Sunday-first month, month/year rollover, selected-date outline, keyboard selection,
sidebar focus and draft-safe day opening. Load failure must offer Retry without invented gray
or zero-score data. Reopen/refinalize must refresh the displayed saved result. Confirm legend
labels match the approved intervals and accessible date labels communicate score/state without
color. Classification examples are confirmed; Calendar score eligibility requires date <= today in America/New_York, finalized status, and score >0. Otherwise show “No data” with neutral styling and no numeric calendar score. Finalized today is eligible immediately; reopening hides the score until refinalization. Daily Completed/Progress retain live scores regardless of finalization. Verify 0 neutral, 44 red, 45 orange, 64 orange, 65 yellow, 84 yellow, 85 green,
94 green, and 95/100/120 bright green; 80% must be yellow on every score display.

Final calendar review: finalize today at 85% and verify immediate green score visibility;
reopen and verify No data without a score even in tooltips/accessible names; refinalize and
verify return of score/color. Past finalized 96% is bright green; unfinalized positive, future,
zero and missing/empty cells stay neutral No data. Daily Completed/Progress remain live.
Perform final rendered/accessibility review only after the calendar is integrated.
