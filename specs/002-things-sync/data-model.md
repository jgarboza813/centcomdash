# Data Model: Sync with Things

## SourceSnapshot (ephemeral)

- Internal snapshot contains candidates/tracked only. The successful operation timestamp is stored as completedAt in SyncResult; no unused transport protocol field is persisted.
- candidates: ordered Things Today entries matching direct exact ❗ tag.
- tracked: one outcome for every requested linked source ID, independent of Today membership.
- SourceTask: nonempty sourceId, nonblank title, direct tag-name array, status
  open/completed/canceled (normalizing source incomplete to open), membership flags inToday/inTrash.
  The HTTP reader must verify exact third-party field shapes before mapping them; IDs remain opaque.
- Tracked outcome: found task or explicit missing/unresolved reason. Missing array entries,
  duplicate contradictory IDs, malformed fields or partial output fail the whole read.
- No notes, full project bodies, unrelated library exports or persisted source snapshots.

## things_links (new SQLite table)

| Field | Constraint |
| --- | --- |
| date | Existing day's YYYY-MM-DD key; foreign key to days.date |
| task_id | Existing local UUID in that day's task array |
| source_id | Nonempty Things identifier, opaque string, not assumed UUID |

Primary key (date, task_id); unique (date, source_id). Enable foreign_keys on connections;
application transaction verifies task_id belongs to the saved aggregate. Ordinary PUT preserves
links for retained IDs, removes links for removed entries, and cannot accept forged source IDs.
A locally removed entry may be reimported on a later explicit sync if it still qualifies; it
will again have at most one entry for that source/day. No source deletion is performed.
Legacy/manual entries have no link. Do not link an existing manual entry by title.

## things_sync_state (new SQLite table)

One row per date: date foreign key, lastSuccessfulAt UTC timestamp, addedCount,
updatedCount, unresolvedCount and structured unresolved summaries from last successful sync.
Counts are nonnegative integers; no changes means added=updated=0. Updated counts entries
whose title or completion actually changed, once per entry. Unresolved IDs count once across
candidate/tracked overlap. Failure messages/current attempt state remain session state;
failures never advance lastSuccessfulAt.

## Existing aggregates and envelopes

DailyPlan task identity/weight/scoreRule and finalized history are unchanged. Extend DayEnvelope
with a server-owned things object containing taskLinks and nullable lastSuccessfulSync metadata;
virtual/legacy days return empty links and null metadata. Month projections remain unchanged.
Sync returns this envelope plus its run result. Client PUT continues submitting only editable
task fields; server preserves links/metadata, including when returning receipt replays.

## Migration and transactions

Upgrade database user_version 1→2 by adding tables; do not rewrite day JSON, receipt responses
or finalized records. Receipt envelopes created before the feature may lack things metadata:
client normalizes absence to empty/null and must not erase newer acknowledged metadata on replay.
Test v1 fixtures, failed upgrades and unknown versions with rollback and refusal to reset data.

Sync successful commit: read/replay receipt → recheck date/revision/lifecycle → pure merge →
write aggregate with incremented revision → links → sync state → receipt → commit. No source
calls inside transaction. A successful no-op still increments revision to persist sync metadata;
no-op refers to tasks/results, not revision. Errors roll back every table.

## State transitions

UI idle/success/failure → running only through Sync with Things activation; running → success
or failure, with no scheduled follow-up. Existing local autosaves must drain first. Lock task
and lifecycle mutations during that day’s operation, including the save-draining stage.
Date navigation retains per-date operation state. A selected day must still be today at start
and commit. No source access occurs for invalid/finalized/stale requests.

## Completion rules

- New valid candidate: initial title/completion from source; weight from its single XL/L/M/S tag.
- Linked completed, not trash: set complete, even outside Today.
- Linked readable open, not trash: set incomplete even outside Today; retain weight and
  refresh title. For rescheduled/open-outside-Today entries also report unresolved membership.
- Missing/canceled/trash: retain local entry, weight and completion; report unresolved.
  Absence alone is not source-open proof.
- Other days and manual entries: unchanged. Finalized days reject sync before source reads.

## Uncertain operation recovery state

Keep original target date, requestId and expectedRevision for an uncertain attempt. Explicit
button recovery is a local receipt lookup only, eligible even after date/lifecycle changes.
Absent receipt returns not committed; active operation returns still running. No fallback read,
write or automatic polling occurs. Preserve newer acknowledged revisions and unsaved drafts
when rendering an older replay result. Recovery is not a new sync lifecycle transition.

## Verified tag/payload clarification

Jose approved existing decorated weight tags: 🔴 XL=20, 🟠 L=10, 🟢 M=5, 🔵 S=1. Plain
XL/L/M/S aliases remain recognized; multiple recognized weight tags are unresolved. Normalize
only Unicode emoji presentation selectors in the ❗ marker; never use substring/title matching.
Pinned things-api 0.3.2/things-py 1.0.1 returns tag-name strings. Verified pinned-library SQL
omits tags when empty and trashed when false; normalize those specific omissions to []/false,
not arbitrary missing status or ID. Completed/canceled/trashed semantics were tested against
synthetic owned data; live Today and by-ID/404 were checked without changing Things items.

## Today and This Evening scope

“Today” source membership includes both Things Today and its This Evening section. The pinned
things-api /today endpoint returns both; no separate evening endpoint or bucket exclusion is used.
Both sections use the same ❗ marker, weight rules, identity and completion reconciliation. The
synthetic pinned-library check in tools/things-api/verify_reader.py verifies both source buckets;
reader and browser fixtures cover evening import through the normal explicit button action.
