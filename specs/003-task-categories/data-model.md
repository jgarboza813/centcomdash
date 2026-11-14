# Data Model: Things Project Categories

## Category snapshot

`{ sourceId: string, name: string }` is the validated containing-project identity and display name.
sourceId is opaque, nonempty and not assumed UUID; name is nonblank, preserves human spelling,
punctuation and emoji. Name is not a unique key. Two same-name projects retain separate identities.
No color, score, area, heading or management settings belong in this object.

## SourceTask addition

Readable active/completed source tasks require `category: CategorySnapshot | null`. Null means confirmed no project,
not failed resolution. Undefined is invalid for these readable tasks. Canceled/trashed outcomes may omit category and bypass project resolution. Existing missing tracked outcomes
remain `{sourceId, missing:true}`; missing/canceled/trashed outcomes do not clear the saved category.
Today and tracked by-ID source paths use the same validation and category resolution.

The Python wire field is `project_category`; Node normalizes it to `category`. An explicit capability
header is required before accepting this field or its null value (see contracts/category-sync.md).

## Daily Task addition

Saved and returned Task adds optional `category?: CategorySnapshot | null`:

| State | Meaning | Display |
| --- | --- | --- |
| Object | Saved project context | Saved name |
| null | Source confirmed no project | Uncategorized |
| Missing | Legacy/manual unknown context | Uncategorized |

New sync writes explicit object/null. Manual new tasks may omit it. Read paths accept omission
without persisting normalization. Existing Plan.schemaVersion=1 and SQL user_version=2 remain valid;
no new table, bulk backfill or DDL migration. Upgrade tests must verify existing saved days/receipts
remain unchanged and write paths preserve the additive field. A stopped-DB backup is still required
before testing against the user's database or rolling application versions back.

## Ownership and changes

- Sync owns category. Browser save input retains its current strict editable task shape and rejects
  client category fields. Ordinary PUT copies category from the saved task with the same local ID.
- New source task: append local identity/weight/completion/category plus existing source link.
- Readable linked source: refresh category identity/name or confirmed null, preserving local task ID
  and assigned weight. Count an entry once if title, completion or category changed together.
- Legacy missing → explicit null counts as a metadata update once; repeat null → null is unchanged.
- Missing/canceled/trashed: preserve saved title/completion/weight/category according to existing policy.
- Failure in category validation or apply: no task, link, timestamp, revision or receipt is committed.
- Rename/move/remove membership: changes only on the next eligible successful explicit sync.
- Category identity is compared by sourceId; name changes also count as a category update.

## History and acknowledgments

Each daily task owns its snapshot independently. No mutable project-name registry is consulted when
reading a day. Finalization preserves it; reopening does not itself refresh it. Past/future/finalized
sync protection remains unchanged. Legacy or replay receipts stay immutable, including omitted fields.
Client merges must not let a lower-revision receipt overwrite a newer category snapshot; task editing
retains metadata while transport continues to send only editable fields. Category is absent from monthly
score summaries because calendar scoring does not need it.

## Analysis remediation A1 — unresolved-task precedence

Canceled or trashed source tasks are classified as unresolved before project resolution. Emit no
project category for those outcomes; the dashboard preserves their saved category and does not
attempt to clear it. Missing tasks retain the existing explicit missing outcome. Required category
object/null validation and project-resolution failures apply to readable active/completed tasks
only. An absent category on an active/completed task remains incompatible and fails the operation.
A dangling project on a canceled/trashed task must not fail other valid updates in the same sync.
