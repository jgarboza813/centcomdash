import { useEffect, useState } from "react";
import { api } from "../api/daily-plans";
import { today } from "../../domain/dates";
import type { MonthDay } from "../../domain/daily-plan";
import { calendarScore, scoreBand, legend } from "../../domain/score-colors";
export function MonthlyScoreCalendar({
  selected,
  onSelect,
  refresh,
}: {
  selected: string;
  onSelect: (d: string) => void;
  refresh: number;
}) {
  const [month, setMonth] = useState(selected.slice(0, 7)),
    [days, setDays] = useState<MonthDay[]>([]),
    [state, setState] = useState("loading"),
    [retry, retryNow] = useState(0);
  useEffect(() => {
    setMonth(selected.slice(0, 7));
  }, [selected]);
  useEffect(() => {
    let active = true;
    setState("loading");
    api<{ days: MonthDay[] }>("/months/" + month)
      .then((r) => {
        if (active) {
          setDays(r.days);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [month, refresh, retry]);
  const start = new Date(month + "-01T12:00:00Z"),
    count = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
    ).getUTCDate();
  function move(n: number) {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <section className="panel calendar-panel" id="calendar" tabIndex={-1}>
      <div className="panel-heading">
        <h2>
          {start.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h2>
        <div>
          <button aria-label="Previous month" onClick={() => move(-1)}>
            ‹
          </button>
          <button aria-label="Next month" onClick={() => move(1)}>
            ›
          </button>
        </div>
      </div>
      {state === "loading" ? (
        <p role="status">Loading scores…</p>
      ) : state === "error" ? (
        <p role="alert">
          Calendar could not load.{" "}
          <button onClick={() => retryNow((x) => x + 1)}>Retry calendar</button>
        </p>
      ) : (
        <>
          <div className="calendar-grid">
            {"SMTWTFS".split("").map((w, i) => (
              <span className="weekday" key={"w" + i}>
                {w}
              </span>
            ))}
            {Array.from({ length: start.getUTCDay() }, (_, i) => (
              <span key={"b" + i} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const date = month + "-" + String(i + 1).padStart(2, "0");
              const day = days.find((d) => d.date === date),
                score = calendarScore(day, today());
              return (
                <button
                  key={date}
                  aria-label={`${date}: ${score === null ? "No data" : score + "%"}${date === today() ? ", today" : ""}`}
                  aria-pressed={date === selected}
                  className={`day score-${scoreBand(score)} ${date === selected ? "selected" : ""} ${date === today() ? "today" : ""}`}
                  onClick={() => onSelect(date)}
                  title={score === null ? "No data" : score + "%"}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="legend">
            {legend.map(([band, label]) => (
              <span key={band}>
                <i className={"score-" + band} />
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
