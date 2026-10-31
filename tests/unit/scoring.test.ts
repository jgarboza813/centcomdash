import { describe, it, expect } from "vitest";
import { result } from "../../src/domain/scoring";
import { scoreBand, calendarScore } from "../../src/domain/score-colors";
import { today, validDate } from "../../src/domain/dates";
import { taskInput } from "../../src/domain/validation";
const tasks = ["XL", "XL", "XL", "L", "L", "M", "M", "M", "S"].map(
  (weightLabel, i) => ({
    id: crypto.randomUUID(),
    title: `Task ${i}`,
    weightLabel,
    weightPoints: ({ XL: 20, L: 10, M: 5, S: 1 } as any)[weightLabel],
    completed: false,
  }),
);
describe("commitment rules", () => {
  it("keeps allocation and score independent", () => {
    expect(result(tasks as any)).toMatchObject({
      plannedPoints: 96,
      remainingPoints: 4,
      scorePercent: 0,
    });
    const done = tasks.map((t, i) => ({ ...t, completed: i < 5 }));
    expect(result(done as any).scorePercent).toBe(80);
    expect(
      result(tasks.map((t) => ({ ...t, completed: true })) as any).scorePercent,
    ).toBe(96);
    expect(result([]).scorePercent).toBeNull();
  });
  it("never caps scores", () =>
    expect(
      result(
        Array.from({ length: 6 }, () => ({
          ...tasks[0],
          completed: true,
        })) as any,
      ),
    ).toMatchObject({ scorePercent: 120, overCapacityPoints: 20 }));
  it.each([
    [null, "none"],
    [0, "none"],
    [1, "red"],
    [44.99, "red"],
    [45, "orange"],
    [64.99, "orange"],
    [65, "yellow"],
    [84.99, "yellow"],
    [85, "green"],
    [94.99, "green"],
    [95, "bright"],
    [120, "bright"],
  ])("classifies %s", (score, band) =>
    expect(scoreBand(score as number | null)).toBe(band),
  );
  it("only shades finalized positive today/past days", () => {
    expect(
      calendarScore(
        { date: "2026-10-31", status: "finalized", scorePercent: 85 },
        "2026-10-31",
      ),
    ).toBe(85);
    expect(
      calendarScore(
        { date: "2026-10-31", status: "editable", scorePercent: 85 },
        "2026-10-31",
      ),
    ).toBeNull();
    expect(
      calendarScore(
        { date: "2026-11-01", status: "finalized", scorePercent: 95 },
        "2026-10-31",
      ),
    ).toBeNull();
  });
  it("validates calendar dates and New York midnight", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2028-02-29")).toBe(true);
    expect(today(new Date("2026-11-01T03:59:00Z"))).toBe("2026-10-31");
  });
  it("rejects blank titles and unknown weights", () => {
    expect(
      taskInput.safeParse({ ...tasks[0], title: " ", weightPoints: undefined })
        .success,
    ).toBe(false);
  });
});
