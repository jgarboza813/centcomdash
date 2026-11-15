import { useId } from "react";
import type { useStreaks } from "../hooks/useStreaks";
const rule = "Finalize each day with at least 85% to build your streak.";
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
export function StreakSummary({
  state,
  sidebar = false,
}: {
  state: ReturnType<typeof useStreaks>;
  sidebar?: boolean;
}) {
  const helpId = useId();
  const { data, phase } = state;
  const feedback =
    phase === "error"
      ? data
        ? "Stale"
        : "Unavailable"
      : phase === "loading"
        ? "Loading streak"
        : phase === "refreshing"
          ? "Updating"
          : "";
  const description = data
    ? `Current streak: ${days(data.current)}. Best: ${days(data.best)}. ${rule}`
    : `Current streak: ${feedback}. ${rule}`;
  const help = (
    <details className="streak-help">
      <summary
        aria-label={sidebar ? "Sidebar streak details" : "Streak details"}
        title={description}
      >
        ⓘ
      </summary>
      <div className="streak-popover" id={helpId}>
        <p>{description}</p>
        {data && <p>As of {data.asOfDate} (New York).</p>}
        {phase === "error" && <p>{state.error}</p>}
      </div>
    </details>
  );
  const retry = phase === "error" && (
    <button
      className="streak-retry"
      onClick={state.retry}
      aria-label={sidebar ? "Retry sidebar streaks" : "Retry streaks"}
    >
      Retry
    </button>
  );
  if (sidebar)
    return (
      <section
        className="sidebar-streak"
        aria-label="Sidebar current streak"
        title={description}
      >
        <div className="streak-rail-count">
          <span aria-hidden="true">🔥</span>
          <strong data-testid="sidebar-streak-count">
            {data ? data.current : "—"}
          </strong>
          <span className="streak-sidebar-units">
            {data ? (data.current === 1 ? "day" : "days") : ""}
          </span>
        </div>
        <div className="sidebar-label">
          <span>Current streak</span>
          <small>{data ? `Best: ${days(data.best)}` : ""}</small>
        </div>
        {feedback && <small className="streak-feedback">{feedback}</small>}
        {help}
        {retry}
      </section>
    );
  return (
    <section
      className="metric panel metric-streak"
      aria-label="Current streak"
      aria-busy={phase === "loading" || phase === "refreshing"}
    >
      <div>
        <h2>Current streak {help}</h2>
        <strong className="streak-count" data-testid="streak-count">
          {data ? data.current : "—"}
          <span className="streak-units">
            {data ? (data.current === 1 ? "day" : "days") : ""}
          </span>
        </strong>
        <p className="streak-detail">
          {data ? `Best: ${days(data.best)}` : feedback}
          {data && feedback && (
            <span className="streak-feedback"> · {feedback}</span>
          )}
          {retry}
        </p>
      </div>
      <span className="streak-icon" aria-hidden="true">
        🔥
      </span>
      <span className="sr-only" role="status">
        {feedback}
        {phase === "error" && data ? `, as of ${data.asOfDate}` : ""}
      </span>
    </section>
  );
}
