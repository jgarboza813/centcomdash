import { expect, it } from "vitest";
import { shiftDate, today } from "../../src/domain/dates";
import { deriveStreaks, type DayScore } from "../../src/domain/streaks";
const day = (
  date: string,
  scorePercent: number | null = 85,
  status: DayScore["status"] = "finalized",
): DayScore => ({ date, scorePercent, status });
it("uses New York midnight and calendar neighbors across month/year/leap/DST/weekends", () => {
  expect(today(new Date("2026-11-14T04:59:59Z"))).toBe("2026-11-13");
  expect(today(new Date("2026-11-14T05:00:00Z"))).toBe("2026-11-14");
  for (const [a, b] of [
    ["2026-12-31", "2027-01-01"],
    ["2024-02-28", "2024-02-29"],
    ["2024-02-29", "2024-03-01"],
    ["2026-03-08", "2026-03-09"],
    ["2026-11-01", "2026-11-02"],
    ["2026-11-13", "2026-11-14"],
  ]) {
    expect(shiftDate(a, 1)).toBe(b);
    expect(shiftDate(b, -1)).toBe(a);
    expect(deriveStreaks([day(a), day(b)], b)).toEqual({
      asOfDate: b,
      current: 2,
      best: 2,
    });
  }
});
it("rejects invalid/duplicate dates, statuses and invalid scores without mutating input", () => {
  for (const date of ["2026-02-29", "oops", "2026-13-01"]) {
    expect(() => shiftDate(date, 1)).toThrow();
    expect(() => deriveStreaks([], date)).toThrow();
    expect(() => deriveStreaks([day(date)], "2026-11-14")).toThrow();
  }
  expect(() =>
    deriveStreaks([day("2026-11-14"), day("2026-11-14")], "2026-11-14"),
  ).toThrow();
  for (const n of [-1, NaN, Infinity])
    expect(() => deriveStreaks([day("2026-11-14", n)], "2026-11-14")).toThrow();
  expect(() =>
    deriveStreaks(
      [{ ...day("2026-11-14"), status: "broken" } as unknown as DayScore],
      "2026-11-14",
    ),
  ).toThrow();
});
it.each([null, 0, 84, 85, 95, 100, 120])(
  "qualifies only finalized fixed-budget scores >=85: %s",
  (score) => {
    const qualifies = score !== null && score >= 85 ? 1 : 0;
    expect(deriveStreaks([day("2026-11-14", score)], "2026-11-14")).toEqual({
      asOfDate: "2026-11-14",
      current: qualifies,
      best: qualifies,
    });
  },
);
it("grants yesterday grace only for absent/editable today, and excludes future keys", () => {
  const days = [day("2026-11-12"), day("2026-11-13")];
  expect(deriveStreaks([], "2026-11-14").current).toBe(0);
  expect(deriveStreaks(days, "2026-11-14").current).toBe(2);
  expect(
    deriveStreaks([...days, day("2026-11-14", 90, "editable")], "2026-11-14")
      .current,
  ).toBe(2);
  expect(deriveStreaks([...days, day("2026-11-14", 84)], "2026-11-14")).toEqual(
    { asOfDate: "2026-11-14", current: 0, best: 2 },
  );
  expect(
    deriveStreaks([...days, day("2026-11-14"), day("2026-11-15")], "2026-11-14")
      .current,
  ).toBe(3);
  expect(deriveStreaks([days[0]], "2026-11-14").current).toBe(0);
  const before = structuredClone(days);
  deriveStreaks(days.reverse(), "2026-11-14");
  expect(days).toEqual(before.reverse());
});
it("recomputes best after reopening or correcting a day across separate runs", () => {
  const days = [
    ...Array.from({ length: 3 }, (_, i) => day(shiftDate("2026-10-01", i))),
    ...Array.from({ length: 7 }, (_, i) => day(shiftDate("2026-10-10", i))),
    day("2026-11-13"),
    day("2026-11-14"),
  ];
  expect(deriveStreaks(days, "2026-11-14")).toEqual({
    asOfDate: "2026-11-14",
    current: 2,
    best: 7,
  });
  const split = days.map((d) =>
    d.date === "2026-10-13" ? { ...d, status: "editable" as const } : d,
  );
  expect(deriveStreaks(split, "2026-11-14").best).toBe(3);
  expect(deriveStreaks(days, "2026-11-14").best).toBe(7);
  expect(
    deriveStreaks([...days.slice(0, -1), day("2026-11-14", 0)], "2026-11-14")
      .current,
  ).toBe(0);
  expect(
    deriveStreaks(
      [...days.slice(0, -1), day("2026-11-14", 0, "editable")],
      "2026-11-14",
    ).current,
  ).toBe(1);
});
