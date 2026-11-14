import { expect, it } from "vitest";
import {
  nextSort,
  sortTasks,
  editingTasks,
} from "../../src/client/task-sorting";
import type { Task } from "../../src/domain/daily-plan";
const tasks: Task[] = [
  {
    id: "a",
    title: "Task 10",
    weightLabel: "S",
    weightPoints: 1,
    completed: true,
  },
  {
    id: "b",
    title: "Écho",
    weightLabel: "XL",
    weightPoints: 20,
    completed: false,
  },
  {
    id: "c",
    title: "echo",
    weightLabel: "M",
    weightPoints: 5,
    completed: true,
  },
  {
    id: "d",
    title: "Task 2",
    weightLabel: "L",
    weightPoints: 10,
    completed: false,
  },
  {
    id: "e",
    title: "Alpha",
    weightLabel: "XL",
    weightPoints: 20,
    completed: false,
  },
];
const ids = (ts: Task[]) => ts.map((t) => t.id);
it("sorts six directions with original-index ties and leaves original tasks unchanged", () => {
  const before = JSON.stringify(tasks);
  for (const [column, direction, expected] of [
    ["task", "ascending", ["e", "b", "c", "d", "a"]],
    ["task", "descending", ["a", "d", "b", "c", "e"]],
    ["weight", "ascending", ["a", "c", "d", "b", "e"]],
    ["weight", "descending", ["b", "e", "d", "c", "a"]],
    ["status", "ascending", ["b", "d", "e", "a", "c"]],
    ["status", "descending", ["a", "c", "b", "d", "e"]],
  ] as const)
    expect(ids(sortTasks(tasks, { column, direction }))).toEqual(expected);
  expect(ids(sortTasks(tasks, null))).toEqual(ids(tasks));
  expect(JSON.stringify(tasks)).toBe(before);
});
it("selects initial directions and toggles without remembering another column direction", () => {
  expect(nextSort(null, "weight")).toEqual({
    column: "weight",
    direction: "descending",
  });
  expect(nextSort(nextSort(null, "weight"), "weight")).toEqual({
    column: "weight",
    direction: "ascending",
  });
  expect(
    nextSort({ column: "task", direction: "descending" }, "status"),
  ).toEqual({ column: "status", direction: "ascending" });
  expect(
    nextSort({ column: "status", direction: "descending" }, "task"),
  ).toEqual({ column: "task", direction: "ascending" });
});
it("reconciles frozen identities using current values, drops removed and appends new tasks", () => {
  const changed = [
    { ...tasks[0], title: "Changed" },
    tasks[2],
    tasks[3],
    { ...tasks[4], id: "new" },
  ];
  expect(ids(editingTasks(changed, ["d", "b", "a", "c"]))).toEqual([
    "d",
    "a",
    "c",
    "new",
  ]);
  expect(editingTasks(changed, ["a"])[0].title).toBe("Changed");
  expect(sortTasks([], null)).toEqual([]);
  expect(
    sortTasks([tasks[0]], { column: "task", direction: "descending" }),
  ).toEqual([tasks[0]]);
});
