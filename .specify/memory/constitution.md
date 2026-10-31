# Central Command Constitution

## Core Principles

### I. Specify Before Coding

Every feature MUST have a written specification with observable behavior and acceptance
criteria before application implementation begins. Requirements, technical decisions, and
implementation tasks MUST remain traceable through Spec Kit artifacts. Material ambiguity
MUST be resolved or explicitly recorded before dependent work proceeds. When behavior changes,
the specification MUST be updated with the implementation so it remains the source of truth.

### II. Preserve the Commitment Model

Task weights MUST represent the share of a day's capacity committed to a task, rather than
an estimate of hours. The initial weights are XL = 20%, L = 10%, M = 5%, and S = 1%.
A 96% allocation MUST be treated as a valid plan with 4% remaining capacity; the application
MUST NOT force plans to total exactly 100% or normalize their allocation to 100%.
Planned allocation and completed results MUST remain distinguishable. Scoring formulas,
including any completion denominator, MUST be defined explicitly in feature specifications
and verified with worked examples before implementation.

### III. Keep the MVP Focused

The MVP MUST cover daily planning, Things 3 import and completion synchronization, daily
scoring, and historical daily, monthly, and yearly views. Work MUST be delivered in bounded,
reviewable increments. AI coaching, planning recommendations, advanced analytics, and advanced
automation MUST remain outside the MVP unless the product scope and this constitution are
explicitly amended. Every proposed feature MUST support an identified user decision or daily
workflow to justify its inclusion.

### IV. Protect Historical Accuracy

Changes to weight settings, source tasks, or synchronization state MUST NOT silently rewrite
historical commitments or results. Specifications MUST define when a day becomes historical,
which values are preserved, and how deliberate corrections affect recorded results.
Imports and completion synchronization MUST have explicit identity, duplicate handling, and
failure behavior so repeated or interrupted operations do not corrupt data. Persistence and
migration decisions MUST account for preservation of recorded history.

### V. Build Simply and Verify Behavior

Architecture MUST use the least complexity needed for the specified behavior. New services,
packages, dependencies, or abstractions MUST have a concrete current requirement and a
recorded rationale; anticipated commercial scale alone is insufficient justification.
Automated tests MUST cover scoring rules, synchronization behavior, and data persistence,
including relevant boundary and failure cases. Tests MUST verify observable outcomes rather
than merely mirror implementation details. Each increment MUST pass its applicable checks
and acceptance criteria before it is reported complete.

### VI. Make Daily Use Effortless

The primary experience MUST be a clean, dark-themed single-page dashboard that supports
planning, reviewing progress, and inspecting history with clear navigation. Core interactions
MUST be usable with a keyboard, expose accessible names and visible focus, and communicate
status without relying on color alone. The layout MUST remain usable across desktop and
smaller screens. Feature specifications MUST define observable usability criteria for the
workflows they introduce, including loading, empty, and error states where applicable.

## Product Boundaries

Central Command supports intentional daily commitment and measurable progress, replacing
the existing spreadsheet workflow while integrating with Things 3. Daily planning, task
completion, and historical reporting MUST share consistent domain definitions.

The prior conversation supplies product context. Assistant suggestions in that conversation
MUST NOT be treated as accepted requirements unless confirmed by the user or adopted in a
reviewed specification. In particular, locking plans, freezing days, configurable weights,
and allocation warning thresholds require explicit feature-level definitions.

Technology stack, storage, hosting, authentication, and integration mechanisms MUST be
selected and justified during planning. This constitution does not select them in advance.

## Development Workflow and Quality Gates

1. Establish or amend the constitution when project-wide principles change.
2. Use Spec Kit to specify a bounded feature with user scenarios and acceptance criteria.
3. Clarify material unknowns, including scoring semantics and historical-data behavior.
4. Produce a technical plan that checks compliance with every applicable principle.
5. Generate ordered tasks and analyze consistency across the specification, plan, and tasks.
6. Implement the tasks and verify acceptance criteria with appropriate automated and manual
   checks. Record validation results and any remaining limitations.

Changes MUST keep the specification, plan, tasks, and implementation consistent. If a change
contradicts a principle, resolve the conflict through an explicit amendment before proceeding.
Visual workflow changes MUST include a review of their rendered appearance and interactions.

## Governance

This constitution governs Central Command specifications, plans, tasks, and implementation.
Each plan and change review MUST assess compliance and identify unresolved conflicts.

Amendments MUST state the reason, affected principles, and effects on existing specifications,
plans, tasks, and recorded data. The project owner MUST agree to material principle or scope
changes. The constitution and affected artifacts MUST be updated together as appropriate.

Versions follow semantic versioning: MAJOR for incompatible principle removals or
redefinitions, MINOR for new principles or material expansions, and PATCH for clarifications
that do not change obligations. Each amendment MUST record its version and amendment date;
the original ratification date MUST remain unchanged.

**Version**: 1.0.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
