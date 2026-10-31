export const weights = { XL: 20, L: 10, M: 5, S: 1 } as const;
export type Weight = keyof typeof weights;
export interface Task {
  id: string;
  title: string;
  weightLabel: Weight;
  weightPoints: number;
  completed: boolean;
}
export interface Plan {
  date: string;
  timezone: "America/New_York";
  status: "editable" | "finalized";
  tasks: Task[];
  scoreRule: "fixed-budget-v1";
  revision: number;
  schemaVersion: 1;
  createdAt: string | null;
  updatedAt: string | null;
  finalizedAt: string | null;
}
export interface DayResult {
  plannedPoints: number;
  completedPoints: number;
  remainingPoints: number;
  overCapacityPoints: number;
  totalCount: number;
  completedCount: number;
  scorePercent: number | null;
}
export interface Envelope {
  plan: Plan;
  result: DayResult;
}
export interface MonthDay {
  date: string;
  status: Plan["status"];
  scorePercent: number | null;
}
export function emptyPlan(date: string): Plan {
  return {
    date,
    timezone: "America/New_York",
    status: "editable",
    tasks: [],
    scoreRule: "fixed-budget-v1",
    revision: 0,
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    finalizedAt: null,
  };
}
