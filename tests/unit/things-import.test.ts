import { expect, it } from "vitest";
import {
  mergeThings,
  sourceTask,
  weightFor,
} from "../../src/domain/things-sync";
import { emptyPlan } from "../../src/domain/daily-plan";
const item = (id: string, tags = ["❗️", "🔴 XL"]) =>
  sourceTask.parse({
    sourceId: id,
    title: "Same title",
    tags,
    status: "open",
    inToday: true,
    inTrash: false,
  });
it("matches marker and decorated weights exactly", () => {
  expect(weightFor(["🔴 XL"])).toBe("XL");
  expect(weightFor(["🔴 XL", "S"])).toBeNull();
  expect(weightFor(["something XL"])).toBeNull();
  const m = mergeThings(
    emptyPlan("2026-10-31"),
    [],
    [item("a"), item("b"), item("no", ["🔴 XL"]), item("bad", ["❗️"])],
    [],
  );
  expect(m.tasks).toHaveLength(2);
  expect(m.tasks[0].weightPoints).toBe(20);
  expect(m.unresolved).toHaveLength(1);
  expect(m.tasks[0].id).not.toBe(m.tasks[1].id);
});
it("preserves weights and IDs and makes source completion authoritative", () => {
  const p = emptyPlan("2026-10-31"),
    first = mergeThings(p, [], [item("a")], []);
  p.tasks = first.tasks;
  p.tasks[0].weightLabel = "M";
  p.tasks[0].weightPoints = 5;
  p.tasks[0].completed = true;
  const next = mergeThings(
    p,
    first.links,
    [],
    [{ ...item("a"), inToday: false }],
  );
  expect(next.tasks[0]).toMatchObject({
    id: first.tasks[0].id,
    weightPoints: 5,
    completed: false,
  });
  expect(next.unresolved[0].reason).toBe("rescheduled");
  const gone = mergeThings(
    p,
    first.links,
    [],
    [{ sourceId: "a", missing: true }],
  );
  expect(gone.tasks[0].completed).toBe(true);
});
it("retains manual tasks and stable identities across ten imports", () => {
  const p = emptyPlan("2026-10-31");
  p.tasks = [
    {
      id: crypto.randomUUID(),
      title: "Same title",
      weightLabel: "S",
      weightPoints: 1,
      completed: true,
    },
  ];
  const candidates = Array.from({ length: 10 }, (_, i) =>
    item(String(i), ["❗", ["XL", "L", "M", "S"][i % 4]]),
  );
  let merged = mergeThings(p, [], candidates, []);
  const ids = merged.tasks.map((t) => t.id);
  for (let n = 0; n < 10; n++) {
    p.tasks = merged.tasks;
    merged = mergeThings(p, merged.links, candidates, candidates);
    expect(merged.tasks.map((t) => t.id)).toEqual(ids);
    expect(merged.addedCount).toBe(0);
  }
  expect(merged.tasks).toHaveLength(11);
  expect(merged.tasks[0].completed).toBe(true);
});
it("keeps canceled, trashed and missing linked state; refreshes readable renamed completed tasks outside Today", () => {
  const p = emptyPlan("2026-10-31");
  const candidates = [item("c"), item("t"), item("m"), item("ok")];
  const first = mergeThings(p, [], candidates, []);
  p.tasks = first.tasks.map((t) => ({ ...t, completed: true }));
  const next = mergeThings(
    p,
    first.links,
    [],
    [
      { ...item("c"), status: "canceled" },
      { ...item("t"), inTrash: true },
      { sourceId: "m", missing: true },
      {
        ...item("ok", []),
        title: "Renamed",
        status: "completed",
        inToday: false,
      },
    ],
  );
  expect(next.tasks.every((t) => t.completed)).toBe(true);
  expect(next.tasks[3]).toMatchObject({
    title: "Renamed",
    weightPoints: 20,
    id: first.tasks[3].id,
  });
  expect(next.updatedCount).toBe(1);
  expect(next.unresolvedCount).toBe(3);
});
it("imports tasks completed before their first sync as completed", () => {
  const merged = mergeThings(
    emptyPlan("2026-10-31"),
    [],
    [
      { ...item("pills", ["❗️", "🔵 S"]), status: "completed" },
      { ...item("floss", ["❗️", "🔵 S"]), status: "completed" },
    ],
    [],
  );
  expect(merged.addedCount).toBe(2);
  expect(merged.tasks.every((t) => t.completed && t.weightPoints === 1)).toBe(
    true,
  );
});
