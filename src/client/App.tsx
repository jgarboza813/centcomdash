import { SyncWithThings } from "./components/SyncWithThings";
import { useState } from "react";
import { useDailyPlan } from "./hooks/useDailyPlan";
import { result } from "../domain/scoring";
import { scoreBand } from "../domain/score-colors";
import { today, dateLabel, greeting } from "../domain/dates";
import { weights } from "../domain/daily-plan";
import { ProgressRing } from "./components/ProgressRing";
import { PlanTable } from "./components/PlanTable";
import { MonthlyScoreCalendar } from "./components/MonthlyScoreCalendar";
function Future({
  title,
  text,
  className = "",
}: {
  title: string;
  text: string;
  className?: string;
}) {
  return (
    <section className={"panel future " + className}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {title === "Insights" && (
          <button disabled title="Coming later">
            View all
          </button>
        )}
      </div>
      <p>
        <span className="future-icon" aria-hidden="true">
          ◇
        </span>
        {text}
        <small>Coming later</small>
      </p>
    </section>
  );
}
export default function App() {
  const h = useDailyPlan(),
    { entry: e, date } = h;
  const [menu, setMenu] = useState(false),
    [actions, setActions] = useState(false);
  const r = result(e.plan.tasks),
    score = r.scorePercent;
  const historic = date !== today(),
    prefix = historic ? "Day’s" : "Today’s";
  const blocked =
    e.syncState.running ||
    e.loading ||
    !!e.loadError ||
    e.plan.status === "finalized" ||
    !!e.request?.path.match(/finalize|reopen/);
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#today"
          aria-label="Central Command"
          title="Central Command"
        >
          <span className="brand-mark" aria-hidden="true">
            ⬡
          </span>
          <span className="sidebar-label">Central Command</span>
        </a>
        <nav aria-label="Main navigation">
          {[
            ["☼", "Today"],
            ["▣", "Calendar"],
            ["◴", "History"],
            ["▥", "Analytics"],
            ["◈", "Categories"],
            ["⚙", "Settings"],
          ].map(([icon, label]) => (
            <button
              key={label}
              aria-label={label}
              className={label === "Today" ? "active" : ""}
              disabled={["Analytics", "Categories", "Settings"].includes(label)}
              title={
                ["Analytics", "Categories", "Settings"].includes(label)
                  ? `${label} — Coming later`
                  : label
              }
              onClick={() => {
                setMenu(false);
                if (label === "Today") h.setDate(today());
                if (label === "Calendar")
                  document.getElementById("calendar")?.focus();
                if (label === "History")
                  document.getElementById("date-picker")?.focus();
              }}
            >
              <span aria-hidden="true">{icon}</span>
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div
            className="streak-future"
            title="Day Streak — Coming later"
            aria-label="Day Streak — Coming later"
          >
            <span aria-hidden="true">♨</span>
            <div className="sidebar-label">
              Day Streak<small>Coming later</small>
            </div>
          </div>
          <div className="identity" title="Jose Marin">
            <span>JM</span>
            <span className="sidebar-label">Jose Marin</span>
          </div>
        </div>
      </aside>
      <main id="today">
        <header>
          <div className="heading-group">
            <button
              className="menu-toggle"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <div>
              <h1>{historic ? "Your day" : greeting()}, Jose.</h1>
              <p>{dateLabel(date)}</p>
            </div>
          </div>
          <div className="header-actions">
            <SyncWithThings
              onSync={() => void h.syncThings()}
              running={e.syncState.running}
              recovery={!!e.syncState.uncertain}
              available={
                date === today() &&
                !e.loading &&
                !e.loadError &&
                e.plan.status === "editable"
              }
            />
            <div className="day-menu">
              <button
                aria-label="More day actions"
                aria-expanded={actions}
                onClick={() => setActions(!actions)}
              >
                ⋮
              </button>
              {actions && (
                <div className="menu-popup">
                  <button
                    disabled={
                      e.pending ||
                      e.syncState.running ||
                      e.loading ||
                      !!e.loadError
                    }
                    onClick={() => {
                      setActions(false);
                      void h.transition(
                        e.plan.status === "finalized" ? "reopen" : "finalize",
                      );
                    }}
                  >
                    {e.plan.status === "finalized"
                      ? "Reopen Day"
                      : "Finalize Day"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="day-toolbar">
          <label className="date-control">
            View day{" "}
            <input
              id="date-picker"
              type="date"
              value={date}
              max={today()}
              onChange={(ev) => {
                if (ev.target.value) h.setDate(ev.target.value);
              }}
            />
          </label>
          <span className="lifecycle">
            {e.plan.status === "finalized" ? "● Finalized" : "○ Editable"}
          </span>
          <span className="save-state" role="status">
            {e.loading
              ? "Loading…"
              : e.saveError
                ? "Save failed"
                : e.pending || e.dirty
                  ? "Pending…"
                  : "Saved"}
          </span>
        </div>
        {(e.syncState.error ||
          e.syncState.result ||
          e.things?.lastSuccessfulSync) && (
          <section className="sync-feedback" aria-label="Things sync result">
            <div role={e.syncState.error ? "alert" : "status"}>
              {e.syncState.error ||
                ((e.syncState.result ?? e.things?.lastSuccessfulSync) &&
                  (() => {
                    const r = (e.syncState.result ??
                      e.things!.lastSuccessfulSync)!;
                    return `${r.addedCount} added · ${r.updatedCount} updated · ${r.unresolvedCount} unresolved${r.addedCount === 0 && r.updatedCount === 0 ? " · No task changes" : ""}. Last successful sync: ${new Date(r.completedAt).toLocaleString()}`;
                  })())}
            </div>
            {(
              e.syncState.result ?? e.things?.lastSuccessfulSync
            )?.unresolved.map((item) => (
              <p key={item.sourceId}>
                {item.title ?? "Linked task"}: {item.reason}
              </p>
            ))}
            {e.syncState.error && (
              <small>
                Activate Sync with Things to{" "}
                {e.syncState.uncertain
                  ? "check the previous result without rereading Things"
                  : "try again"}
                . Last successful sync:{" "}
                {(e.syncState.result ?? e.things?.lastSuccessfulSync)
                  ?.completedAt ?? "Never"}
              </small>
            )}
          </section>
        )}
        {e.saveError && (
          <div className="error-banner" role="alert">
            {e.saveError}{" "}
            {e.saveError.startsWith("Conflict:") ? (
              <button onClick={h.reload}>Reload saved day</button>
            ) : (
              <button onClick={h.retry}>Retry save</button>
            )}
          </div>
        )}
        {e.loadError ? (
          <div className="panel error" role="alert">
            Could not load this day.{" "}
            <button onClick={h.reload}>Retry load</button>
          </div>
        ) : e.loading ? (
          <div className="loading panel" role="status">
            Loading your day…
          </div>
        ) : (
          <>
            <div className="summary">
              <section className="metric panel">
                <div>
                  <h2>Planned</h2>
                  <strong className="allocation">{r.plannedPoints}%</strong>
                  <p>{r.plannedPoints} / 100 pts</p>
                </div>
                <ProgressRing score={r.plannedPoints} planned />
              </section>
              <section className="metric panel">
                <div>
                  <h2>Completed</h2>
                  <strong className={"score-" + scoreBand(score)}>
                    {score === null ? "No plan" : score + "%"}
                  </strong>
                  <p>{r.completedPoints} / 100 pts</p>
                </div>
                <ProgressRing score={score} />
              </section>
              <section className="metric panel">
                <div>
                  <h2>Tasks</h2>
                  <strong className="purple">{r.totalCount}</strong>
                  <p>
                    {r.completedCount} done · {r.totalCount - r.completedCount}{" "}
                    left
                  </p>
                </div>
                <span className="task-icon" aria-hidden="true">
                  ▤
                </span>
              </section>
              <section className="metric panel metric-streak">
                <div>
                  <h2>Streak</h2>
                  <strong className="streak-icon" aria-hidden="true">
                    ♨
                  </strong>
                  <p>Coming later</p>
                </div>
              </section>
            </div>
            <div className="content-grid">
              <div className="left-column">
                <PlanTable
                  title={prefix + " Plan"}
                  tasks={e.plan.tasks}
                  change={h.edit}
                  disabled={blocked}
                  linkedIds={e.things?.taskLinks.map((l) => l.task_id)}
                  result={r}
                />
                <div className="lower-left">
                  <Future
                    title={prefix + " Timeline"}
                    text="Task scheduling"
                    className="timeline"
                  />
                  <MonthlyScoreCalendar
                    selected={date}
                    onSelect={h.setDate}
                    refresh={h.savedTick}
                  />
                </div>
              </div>
              <div className="right-column">
                <section className="panel progress-panel">
                  <h2>{prefix} Progress</h2>
                  <div className="progress-body">
                    <div>
                      <ProgressRing score={score} large />
                      <p>{r.completedPoints} / 100 daily budget points</p>
                    </div>
                    <div className="curve-slot">
                      <span>↗</span>
                      <p>
                        Progress over time<small>Coming later</small>
                      </p>
                    </div>
                  </div>
                  {score !== null && score > 100 && (
                    <p>Score exceeds 100% by {score - 100} points</p>
                  )}
                </section>
                <Future title="Points by Category" text="Category breakdown" />
                <section className="panel weight-guide">
                  <h2>Weight Guide</h2>
                  <div>
                    {Object.entries(weights).map(([w, pts]) => (
                      <div key={w}>
                        <span className={"badge " + w}>{w}</span>
                        <p>
                          {pts} {pts === 1 ? "pt" : "pts"}
                          <small>{pts}% of daily capacity</small>
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
                <Future
                  title={historic ? "Notes for This Day" : "Notes for Today"}
                  text="Daily notes"
                />
                <Future title="Insights" text="Personal insights" />
              </div>
            </div>
          </>
        )}
        <footer>
          Central Command <span>Make the day count.</span>
        </footer>
      </main>
    </div>
  );
}
