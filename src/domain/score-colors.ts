import type { MonthDay } from "./daily-plan";
export function scoreBand(score: number | null | undefined) {
  return score == null || score === 0
    ? "none"
    : score >= 95
      ? "bright"
      : score >= 85
        ? "green"
        : score >= 65
          ? "yellow"
          : score >= 45
            ? "orange"
            : "red";
}
export function calendarScore(day: MonthDay | undefined, today: string) {
  return day &&
    day.date <= today &&
    day.status === "finalized" &&
    day.scorePercent != null &&
    day.scorePercent > 0
    ? day.scorePercent
    : null;
}
export const legend = [
  ["bright", "≥95%"],
  ["green", "85–<95%"],
  ["yellow", "65–<85%"],
  ["orange", "45–<65%"],
  ["red", ">0–<45%"],
  ["none", "No data"],
] as const;
