import type { Task, DayResult } from "./daily-plan";
export function result(tasks: Task[]): DayResult {
  const plannedPoints = tasks.reduce((a, t) => a + t.weightPoints, 0);
  const done = tasks.filter((t) => t.completed);
  const completedPoints = done.reduce((a, t) => a + t.weightPoints, 0);
  return {
    plannedPoints,
    completedPoints,
    remainingPoints: Math.max(0, 100 - plannedPoints),
    overCapacityPoints: Math.max(0, plannedPoints - 100),
    totalCount: tasks.length,
    completedCount: done.length,
    scorePercent: tasks.length ? completedPoints : null,
  };
}
