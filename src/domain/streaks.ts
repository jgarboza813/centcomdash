import { shiftDate, validDate } from "./dates";
export interface DayScore {
  date: string;
  status: "editable" | "finalized";
  scorePercent: number | null;
}
export interface StreakSummary {
  asOfDate: string;
  current: number;
  best: number;
}
export function isStreakSummary(value: unknown): value is StreakSummary {
  if (!value || typeof value !== "object") return false;
  const s = value as StreakSummary;
  return (
    typeof s.asOfDate === "string" &&
    validDate(s.asOfDate) &&
    Number.isSafeInteger(s.current) &&
    s.current >= 0 &&
    Number.isSafeInteger(s.best) &&
    s.best >= s.current
  );
}
export function deriveStreaks(
  history: readonly DayScore[],
  asOfDate: string,
): StreakSummary {
  if (!validDate(asOfDate)) throw new Error("Invalid as-of date");
  const seen = new Set<string>();
  for (const d of history) {
    if (
      !validDate(d.date) ||
      seen.has(d.date) ||
      !["editable", "finalized"].includes(d.status) ||
      (d.scorePercent !== null &&
        (!Number.isFinite(d.scorePercent) || d.scorePercent < 0))
    )
      throw new Error("Invalid saved score projection");
    seen.add(d.date);
  }
  const days = history
    .filter((d) => d.date <= asOfDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  let best = 0,
    run = 0,
    previous: string | undefined;
  const ends = new Map<string, number>();
  for (const d of days) {
    const qualifies =
      d.status === "finalized" &&
      d.scorePercent !== null &&
      d.scorePercent >= 85;
    run = qualifies
      ? previous && shiftDate(previous, 1) === d.date
        ? run + 1
        : 1
      : 0;
    best = Math.max(best, run);
    ends.set(d.date, run);
    previous = d.date;
  }
  const currentDay = days.find((d) => d.date === asOfDate);
  const anchor =
    currentDay?.status === "finalized" ? asOfDate : shiftDate(asOfDate, -1);
  return { asOfDate, current: ends.get(anchor) ?? 0, best };
}
