# Central Command

A local daily commitment dashboard: plan weighted tasks, track your fixed-budget score,
and finalize days for a color-coded historical calendar.

## Run locally

Use Node **24** (`.nvmrc`). With nvm: `nvm install && nvm use`. Then:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies the API to port 3001. Both listeners are local only.
This session provisioned a temporary runtime without replacing system Node; if you need it:

```sh
export PATH="/private/tmp/centcom-node-runtime/node_modules/node/bin:$PATH"
npm run dev
```

The temporary runtime may disappear during system cleanup; use your version manager for a
permanent project runtime. For the built client, `npm run build && npm start`, then open
http://127.0.0.1:3001. Close the dev servers first to free port 3001.

## Rules

XL/L/M/S contribute 20/10/5/1 points. The score is completed points out of a fixed 100, with
no normalization or cap. The shared colors are >=95 bright green, >=85 green, >=65 yellow,
>=45 orange, >0 red; zero/null is neutral. The calendar only shows positive finalized scores
for today or past dates. Reopening hides calendar scores until refinalized. Live daily scores
remain available before finalization.

Use Edit Plan to rename, reweight or remove tasks. Complete tasks directly in table view.
The upper-right day menu contains Finalize Day/Reopen Day. Changes autosave; wait for Saved
before closing. Failed saves preserve session input with Retry; conflicts require a deliberate
reload/discard. Unacknowledged browser input is not guaranteed after browser termination.

## Data and backup

Data is stored in `data/central-command.sqlite`, outside browser storage and ignored by Git.
Set `CENTCOM_DB_PATH` to use a different file. Stop the application before copying the SQLite
file for backup. To restore, stop the server, keep a copy of the existing file, then replace
it with your backup and restart. No backup is uploaded or sent anywhere. Schema startup refuses
unknown versions or failed migrations instead of deleting history.

This is a single-user local application. Authentication, public hosting, category
breakdown, streaks, timeline, notes and insights are not implemented; their labeled areas retain
the approved composition. Do not expose the server to a public network.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Browser tests use installed Google Chrome and separate temporary test databases. They do not
open the user database. Stop other instances before E2E tests (ports 5173/3001 must be free).
Screenshots are in ignored `artifacts/dashboard/`; failure traces are in `test-results/`.
Specifications, acceptance scenarios, plan, tasks and recorded validation are under
`specs/001-daily-planning-scoring/`.

## Sync with Things

See [local service setup](tools/things-api/README.md). Start the pinned read-only Python service,
then explicitly activate **Sync with Things** on today's editable dashboard. No source reads
occur on startup, reload, focus, timers, ordinary edits or date navigation.

Imports select Today to-dos with the ❗/❗️ tag and exactly one weight tag. Existing decorated
tags are supported: 🔴 XL, 🟠 L, 🟢 M, 🔵 S, with plain XL/L/M/S aliases. Missing/conflicting
weights are skipped and reported. Title text alone does not select a task. Assigned daily
weights are preserved on later syncs. Things controls linked completion on sync, overriding
local checkbox changes; missing/canceled/trashed source tasks remain unresolved rather than
being removed or inferred complete. Source renames refresh linked titles on editable days.

Finalized days remain protected. A failed/uncertain operation never retries automatically;
activate the same button explicitly to retry or recover its saved receipt. Recovery can work
after midnight/finalization without reading Things or modifying plans. See the sync result
for added/updated/unresolved counts and last successful time. Credentials and local backup
files stay in ignored data/, never the browser or repository.
