import type { Task } from "../domain/daily-plan";
export type SortColumn = "task" | "weight" | "status";
export type SortDirection = "ascending" | "descending";
export type SortSelection = {
  column: SortColumn;
  direction: SortDirection;
} | null;
const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
const rank = { S: 0, M: 1, L: 2, XL: 3 };
export function nextSort(
  current: SortSelection,
  column: SortColumn,
): NonNullable<SortSelection> {
  return {
    column,
    direction:
      current?.column === column
        ? current.direction === "ascending"
          ? "descending"
          : "ascending"
        : column === "weight"
          ? "descending"
          : "ascending",
  };
}
export function sortTasks(
  tasks: readonly Task[],
  selection: SortSelection,
): Task[] {
  if (!selection) return [...tasks];
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const primary =
        selection.column === "task"
          ? collator.compare(a.task.title, b.task.title)
          : selection.column === "weight"
            ? rank[a.task.weightLabel] - rank[b.task.weightLabel]
            : Number(a.task.completed) - Number(b.task.completed);
      return (
        (selection.direction === "ascending" ? primary : -primary) ||
        a.index - b.index
      );
    })
    .map(({ task }) => task);
}
export function editingTasks(
  tasks: readonly Task[],
  ids: readonly string[],
): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const ordered: Task[] = [];
  for (const id of ids) {
    const task = byId.get(id);
    if (task) {
      ordered.push(task);
      byId.delete(id);
    }
  }
  for (const task of tasks)
    if (byId.has(task.id)) {
      ordered.push(task);
      byId.delete(task.id);
    }
  return ordered;
}
