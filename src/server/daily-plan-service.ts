// The service boundary exposes transactional store operations without coupling routes to SQL.
export {
  readDay,
  mutate,
  monthDays,
  readStreakSummary,
  AppError,
} from "./db/daily-plan-store";
