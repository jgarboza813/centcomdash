# Feature Specification: Things Project Categories

**Feature Branch**: `main` (no feature branch created)

**Created**: 2026-11-01

**Status**: Implemented and validated (see validation.md)

**Input**: Show the Things 3 project as each task's category underneath its title, replacing the blue “Things” label, inspired by the supplied Things task-list image.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize a task's project (Priority: P1)

Jose reviews his daily plan and sees the project associated with each imported task without opening Things.

**Why this priority**: Project context distinguishes commitments and makes the plan easier to scan.

**Independent Test**: Sync marked tasks from Bodybuilding, Travel and Health Management; inspect each task's title and category at desktop and mobile widths.

**Acceptance Scenarios**:

1. **Given** Gym belongs to Bodybuilding in Things, **When** Jose explicitly syncs, **Then** Gym appears with Bodybuilding on a separate line directly beneath its title.
2. **Given** a task belongs to Travel, **When** it is displayed, **Then** Travel uses the existing blue label styling beneath the title and the “↗ Things” label is absent.
3. **Given** tasks from Today and This Evening, including eligible tasks completed before their first import, **When** sync succeeds, **Then** all imported tasks receive their respective project categories using the same selection rules as before.
4. **Given** a task has no project, **When** it is displayed, **Then** its secondary line reads “Uncategorized”; an area, heading or task title is not substituted as a project.

---

### User Story 2 - Refresh category context deliberately (Priority: P2)

Jose moves a task to a different project or renames its project in Things and refreshes that context through the existing sync action.

**Why this priority**: Categories should reflect the source without creating duplicate commitments or background synchronization.

**Independent Test**: Sync a task, move it between projects, rename its project, and sync again; inspect the same local task after each action.

**Acceptance Scenarios**:

1. **Given** a linked task moves from Travel to Personal in Things, **When** the next explicit sync succeeds for today's editable plan, **Then** its category becomes Personal while its local identity and assigned weight remain unchanged.
2. **Given** a project is renamed, **When** the next explicit sync succeeds, **Then** linked tasks display its new name without being duplicated or relinked by title.
3. **Given** a linked task is moved out of its project, **When** a readable source explicitly has no project, **Then** the task becomes Uncategorized.
4. **Given** Things is unavailable or category details cannot be read reliably, **When** sync fails, **Then** the previously saved tasks and categories remain intact and the existing actionable error is shown.
5. **Given** a linked source task is missing, canceled or trashed, **When** existing sync rules retain the task as unresolved, **Then** its last saved category is retained too.

---

### User Story 3 - Review stable category history (Priority: P3)

Jose reopens the dashboard or inspects a recorded day and sees the category context saved with that plan.

**Why this priority**: Project changes must not silently rewrite recorded history.

**Independent Test**: Finalize a categorized day, change the source project, and review the saved day; reload an editable categorized plan as well.

**Acceptance Scenarios**:

1. **Given** a finalized day contains a Travel task, **When** its source project later changes, **Then** the saved day continues to show Travel without contacting Things.
2. **Given** an older saved task has no category metadata, **When** its day is loaded, **Then** the task displays Uncategorized and its identity, completion and scoring remain unchanged.
3. **Given** a newly created manual task, **When** it is displayed, **Then** it displays Uncategorized without requiring a category choice.
4. **Given** a categorized task is manually renamed, reweighted or checked, **When** the plan saves and reloads, **Then** its category remains intact.

### Edge Cases

- Identical project names must not merge distinct source projects or task identities.
- Tasks beneath headings use the containing project, not the heading name.
- A confirmed absence of a project is distinct from a failed or incomplete source read; only the former clears a saved category.
- Project names containing punctuation, emoji or markup-like text display as text.
- Long project names wrap within the task-title column without covering weight, points or completion controls.
- Category changes and failed syncs must not change finalized calendar shading, daily scores or assigned weights.
- Existing missing category metadata is not backfilled by browsing history, opening the app or changing dates.
- On reopening a finalized day, existing sync eligibility still applies: only today's editable plan may refresh from Things.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each imported task MUST retain the identity and display name of its containing Things project as its category, or an explicit absence of project when confirmed by the source.
- **FR-002**: Task rows MUST display the category name directly underneath the title, using the existing blue secondary-label styling. The “Things” text and arrow label MUST be removed. Category text MUST not imply a navigational action that is unavailable.
- **FR-003**: A task without a saved project category MUST display “Uncategorized”. This includes manual tasks and legacy saved tasks until a later eligible explicit sync supplies project context.
- **FR-004**: Category import and refresh MUST occur only within an explicit Sync with Things operation. The current Today/This Evening selection, marker/weight requirements, completion authority and recovery-only rules MUST remain in force.
- **FR-005**: A successful sync MUST refresh linked tasks' project membership and project names without changing their identities or assigned daily weights. Category-only changes MUST count an affected task once in the existing updated count.
- **FR-006**: A readable source task with confirmed no-project membership MUST clear its previous category. Missing/canceled/trashed unresolved tasks MUST preserve their previous category. Unreadable or incomplete project data MUST fail the sync without partially applying changes.
- **FR-007**: Saved categories MUST survive reloads and ordinary task edits. Existing plans MUST continue to load without data loss when they have no category metadata.
- **FR-008**: Finalized and historical plans MUST preserve their saved category context. Source project renames, moves or deletion MUST NOT retroactively rewrite those plans. No automatic historical backfill is allowed.
- **FR-009**: Categorization MUST NOT alter planned/completed point formulas, weights, score colors, task ordering or calendar eligibility. Existing source completion behavior remains authoritative on eligible sync.
- **FR-010**: Category names MUST remain readable at 375px, tablet and desktop widths without horizontal page overflow or overlap with task controls. Long names MUST wrap, and task completion/edit controls MUST retain their accessible names and keyboard behavior.
- **FR-011**: Categorization MUST use project context only. Areas and headings MUST NOT silently become categories. Project identity MUST be independent of its name, so same-name projects and project renames do not merge records.
- **FR-012**: The UI MUST retain an accessible explanation that Things controls linked-task completion on sync even after the visible Things label is removed.

### Key Entities *(include if feature involves data)*

- **Task category snapshot**: Project identity and name saved with a daily task; absent for Uncategorized tasks. Captures context at import or last eligible successful sync.
- **Things project**: Source grouping that supplies category identity and display name. Not an area or heading; its name may change and need not be unique.
- **Daily task**: Existing commitment with stable local identity, assigned weight and completion, now carrying optional project category context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a controlled selection of at least ten eligible tasks across three projects and no-project membership, 100% show the correct project or Uncategorized after a successful sync and reload.
- **SC-002**: Every task row places its category below its title; zero rows retain the blue “Things” label. At 375px, 800px and 1440px there is no horizontal overflow or control overlap, including an 80-character project name.
- **SC-003**: Across ten repeated syncs with project renames and task moves, no task is duplicated and no assigned weight is changed by category refresh.
- **SC-004**: All tested finalized/historical tasks retain their saved category, score and calendar shading after source project changes.
- **SC-005**: Failed category reads leave saved plans and category metadata unchanged; loading, reloading and date navigation cause zero source reads.

## Assumptions

- “Events” refers to the existing Things to-dos imported as dashboard tasks.
- This increment delivers project-backed task labels and their persistence/sync behavior. Category management, manual category assignment, filtering, the Categories navigation destination and the Points by Category chart remain follow-up work.
- The supplied image guides the title/category hierarchy; the requested blue styling comes from the existing Things label rather than the image's gray project text.
- Uncategorized is the fallback for no project, including a task directly in an area. This label is a proposed default and can be revised during review.
- The existing read-only Things integration supplies or can reliably resolve containing-project context; compatibility must be verified during planning before implementation assumptions are made.
- This feature depends on the existing planning, saved-history and explicit Things synchronization behavior. It introduces no source writes, timers or automatic retries.

## Analysis remediation A1 — unresolved-task precedence

Canceled or trashed source tasks are classified as unresolved before project resolution. Emit no
project category for those outcomes; the dashboard preserves their saved category and does not
attempt to clear it. Missing tasks retain the existing explicit missing outcome. Required category
object/null validation and project-resolution failures apply to readable active/completed tasks
only. An absent category on an active/completed task remains incompatible and fails the operation.
A dangling project on a canceled/trashed task must not fail other valid updates in the same sync.
