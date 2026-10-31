import { useRef, useState } from "react";
import { weights, type Task, type Weight } from "../../domain/daily-plan";
import type { DayResult } from "../../domain/daily-plan";
export function PlanTable({
  linkedIds = [],
  tasks,
  change,
  disabled,
  result,
  title,
}: {
  linkedIds?: string[];
  tasks: Task[];
  change: (tasks: Task[]) => void;
  disabled: boolean;
  result: DayResult;
  title: string;
}) {
  const [editing, setEditing] = useState(false),
    [adding, setAdding] = useState(false),
    [error, setError] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  function patch(id: string, p: Partial<Task>) {
    change(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));
  }
  return (
    <section className="panel plan-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {!disabled && (
          <button
            aria-label={editing ? "Done" : "Edit Plan"}
            onClick={() => setEditing(!editing)}
          >
            ✎ {editing ? "Done" : "Edit Plan"}
          </button>
        )}
      </div>
      <div className="task-head">
        <span>Task</span>
        <span>Weight</span>
        <span>Points</span>
        <span>Status</span>
      </div>
      {tasks.length === 0 && (
        <p className="empty">
          Make room for what matters.
          <br />
          <span>Add your first task to plan this day.</span>
        </p>
      )}
      {tasks.map((t) => (
        <div className="task-row" key={t.id}>
          <div className="task-title">
            {editing && !disabled ? (
              <>
                <input
                  aria-label={`Title for ${t.title}`}
                  defaultValue={t.title}
                  key={t.id + t.title}
                  onBlur={(ev) => {
                    if (!ev.target.value.trim()) {
                      setError("A task title cannot be empty.");
                      ev.target.value = t.title;
                    } else {
                      patch(t.id, { title: ev.target.value.trim() });
                      setError("");
                    }
                  }}
                />
                <button
                  className="remove"
                  aria-label={`Remove ${t.title}`}
                  onClick={() => {
                    change(tasks.filter((x) => x.id !== t.id));
                    addButton.current?.focus();
                  }}
                >
                  ×
                </button>
              </>
            ) : (
              <span>
                {t.title}
                {linkedIds.includes(t.id) && (
                  <span
                    className="things-link"
                    title="Things controls completion on sync"
                    aria-label="Things controls completion on sync"
                  >
                    {" "}
                    ↗ Things
                  </span>
                )}
              </span>
            )}
          </div>
          <div>
            {editing && !disabled ? (
              <select
                aria-label={`Weight for ${t.title}`}
                value={t.weightLabel}
                onChange={(ev) => {
                  const weightLabel = ev.target.value as Weight;
                  patch(t.id, {
                    weightLabel,
                    weightPoints: weights[weightLabel],
                  });
                }}
              >
                {Object.keys(weights).map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            ) : (
              <span className={"badge " + t.weightLabel}>{t.weightLabel}</span>
            )}
          </div>
          <span className="points">{t.weightPoints}</span>
          <input
            className="status-check"
            type="checkbox"
            aria-label={`Complete ${t.title}`}
            checked={t.completed}
            disabled={disabled}
            onChange={() => patch(t.id, { completed: !t.completed })}
          />
        </div>
      ))}
      <div className="plan-total">
        <span>Total</span>
        <strong>
          {result.plannedPoints} / 100 <small>points</small>
        </strong>
        <span className="capacity">
          {result.overCapacityPoints
            ? `${result.overCapacityPoints}% over capacity`
            : `${result.remainingPoints}% remaining`}
        </span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!disabled &&
        (adding ? (
          <form
            className="add-form"
            onSubmit={(ev) => {
              ev.preventDefault();
              const data = new FormData(ev.currentTarget),
                title = String(data.get("title") ?? "").trim(),
                w = String(data.get("weight") ?? "") as Weight;
              if (!title || !Object.hasOwn(weights, w)) {
                setError("Enter a title and select a weight.");
                return;
              }
              change([
                ...tasks,
                {
                  id: crypto.randomUUID(),
                  title,
                  weightLabel: w,
                  weightPoints: weights[w],
                  completed: false,
                },
              ]);
              setAdding(false);
              setError("");
              addButton.current?.focus();
            }}
          >
            <label>
              Task title
              <input autoFocus name="title" />
            </label>
            <label>
              Weight
              <select aria-label="Weight" name="weight" defaultValue="">
                <option value="">Choose weight</option>
                {Object.keys(weights).map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="primary" type="submit">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setError("");
                  addButton.current?.focus();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            ref={addButton}
            className="add-task"
            onClick={() => setAdding(true)}
          >
            ＋ Add task
          </button>
        ))}
    </section>
  );
}
