# Task Category UI Contract

- Each task's title remains primary; its saved project name appears on a separate block immediately
  below it in the same task column. Missing/null category displays Uncategorized for imported,
  manual and legacy tasks. Label remains visible during task editing beneath the title controls.
- Replace the visible arrow/Things label entirely. Reuse its blue #82b6ea secondary styling and
  existing small-label treatment; permit normal wrapping, including overflow-wrap for long tokens.
  Do not inherit the old white-space:nowrap rule. Keep sufficient line-height and row padding.
- Category is descriptive text, not a link/button. Rendering names as text prevents markup execution.
  Existing blue score/weight semantics and all other panels remain unaffected.
- Keep checkbox accessible name `Complete <task title>` and weight/title/remove names unchanged.
  For linked tasks, attach a stable per-task description via aria-describedby explaining “Things
  controls completion on sync”. Use visually hidden descriptive text; don't rename the category
  itself to the source-authority explanation. Manual controls have no Things description.
- At 375px, 800px and 1440px, an 80-character name and emoji/plain names must stay inside the
  title column with no overlap or horizontal page overflow. Preserve focus and keyboard operation.
- Loading and source failure use existing feedback; do not replace saved categories with blanks or
  temporary guessed source names. Browsing/rendering never contacts Things.
- Categories navigation and Points by Category remain truthful coming-later placeholders. No
  filtering, editing, chart aggregation, category color scheme or hidden navigation action is added.
