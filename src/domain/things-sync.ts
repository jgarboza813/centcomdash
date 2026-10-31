import { z } from "zod";
import { weights, type Plan, type Task, type Weight } from "./daily-plan";
export const sourceTask = z.object({
  sourceId: z.string().min(1),
  title: z.string().trim().min(1),
  tags: z.array(z.string()),
  status: z.enum(["open", "completed", "canceled"]),
  inToday: z.boolean(),
  inTrash: z.boolean(),
});
export type SourceTask = z.infer<typeof sourceTask>;
export interface Link {
  task_id: string;
  source_id: string;
}
export type Tracked = SourceTask | { sourceId: string; missing: true };
export interface Snapshot {
  candidates: SourceTask[];
  tracked: Tracked[];
}
export interface Unresolved {
  sourceId: string;
  title?: string;
  reason: string;
}
const weightTags: Record<string, Weight> = {
  XL: "XL",
  L: "L",
  M: "M",
  S: "S",
  "🔴 XL": "XL",
  "🟠 L": "L",
  "🟢 M": "M",
  "🔵 S": "S",
};
export function weightFor(tags: string[]): Weight | null {
  const matches = tags.filter((t) => Object.hasOwn(weightTags, t));
  return matches.length === 1 ? weightTags[matches[0]] : null;
}
export function hasMarker(tags: string[]) {
  return tags.some((t) => t.replace(/[\uFE0E\uFE0F]/g, "") === "❗");
}
export function mergeThings(
  plan: Plan,
  links: Link[],
  candidates: SourceTask[],
  tracked: Tracked[],
) {
  const tasks = plan.tasks.map((t) => ({ ...t }));
  const nextLinks = links.map((l) => ({ ...l }));
  const unresolved: Unresolved[] = [];
  let addedCount = 0,
    updatedCount = 0;
  function issue(t: { sourceId: string; title?: string }, reason: string) {
    if (!unresolved.some((u) => u.sourceId === t.sourceId))
      unresolved.push({ sourceId: t.sourceId, title: t.title, reason });
  }
  for (const link of links) {
    const source = tracked.find((t) => t.sourceId === link.source_id);
    const local = tasks.find((t) => t.id === link.task_id);
    if (!local) continue;
    if (!source || "missing" in source) {
      issue({ sourceId: link.source_id }, "missing-source");
      continue;
    }
    if (source.inTrash || source.status === "canceled") {
      issue(source, source.inTrash ? "trashed" : "canceled");
      continue;
    }
    const complete = source.status === "completed";
    if (local.title !== source.title || local.completed !== complete)
      updatedCount++;
    local.title = source.title;
    local.completed = complete;
    if (!source.inToday && !complete) issue(source, "rescheduled");
  }
  for (const t of candidates) {
    if (
      nextLinks.some((l) => l.source_id === t.sourceId) ||
      !t.inToday ||
      !hasMarker(t.tags)
    )
      continue;
    if (t.inTrash || t.status === "canceled") {
      issue(t, t.inTrash ? "trashed" : "canceled");
      continue;
    }
    const weight = weightFor(t.tags);
    if (!weight) {
      issue(
        t,
        t.tags.some((tag) => Object.hasOwn(weightTags, tag))
          ? "conflicting-weights"
          : "missing-weight",
      );
      continue;
    }
    const task: Task = {
      id: crypto.randomUUID(),
      title: t.title,
      weightLabel: weight,
      weightPoints: weights[weight],
      completed: t.status === "completed",
    };
    tasks.push(task);
    nextLinks.push({ task_id: task.id, source_id: t.sourceId });
    addedCount++;
  }
  return {
    tasks,
    links: nextLinks,
    addedCount,
    updatedCount,
    unresolvedCount: unresolved.length,
    unresolved,
  };
}
