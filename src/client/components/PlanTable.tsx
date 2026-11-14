import { useId, useLayoutEffect, useRef, useState } from "react";
import { weights, type Task, type Weight } from "../../domain/daily-plan";
import type { DayResult } from "../../domain/daily-plan";
import {
  editingTasks,
  nextSort,
  sortTasks,
  type SortColumn,
  type SortSelection,
} from "../task-sorting";
export function PlanTable({
  linkedIds = [],
  tasks,
  change,
  disabled,
  result,
  title,
  sort,
  setSort,
}: {
  linkedIds?: string[];
  tasks: Task[];
  change: (tasks: Task[]) => void;
  disabled: boolean;
  result: DayResult;
  title: string;
  sort: SortSelection;
  setSort: (sort: SortSelection) => void;
}) {
  const [editingOrder, setEditingOrder] = useState<string[] | null>(null),
    [adding, setAdding] = useState(false),
    [error, setError] = useState(""),
    [announcement, announce] = useState("");
  const editing = editingOrder !== null;
  const displayed = editing
    ? editingTasks(tasks, editingOrder)
    : sortTasks(tasks, sort);
  const descriptionId = useId();
  const pauseText =
    "Sorting is paused while editing. Select Done to apply your sort.";
  const headerRefs = useRef(new Map<SortColumn, HTMLButtonElement>());
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>());
  const focusOrigin = useRef<{ id: string; element: HTMLInputElement } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (!editing) return;
    setEditingOrder((current) => {
      if (!current) return current;
      const next = editingTasks(tasks, current).map((t) => t.id);
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [tasks, editing]);
  useLayoutEffect(() => {
    const origin = focusOrigin.current;
    focusOrigin.current = null;
    if (
      origin &&
      !disabled &&
      (document.activeElement === origin.element ||
        document.activeElement === document.body)
    )
      checkboxRefs.current.get(origin.id)?.focus({ preventScroll: true });
  }, [tasks, disabled]);
  const addButton = useRef<HTMLButtonElement>(null);
  function patch(id: string, p: Partial<Task>) {
    change(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));
  }
  return (
    <section className="panel plan-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        <div className="plan-actions">
          {sort && (
            <button
              disabled={editing}
              aria-describedby={descriptionId}
              onClick={() => {
                const column = sort.column;
                setSort(null);
                announce("Saved task order restored.");
                headerRefs.current.get(column)?.focus();
              }}
            >
              Reset sort
            </button>
          )}
          {!disabled && (
            <button
              aria-label={editing ? "Done" : "Edit Plan"}
              onClick={() =>
                setEditingOrder(editing ? null : displayed.map((t) => t.id))
              }
            >
              ✎ {editing ? "Done" : "Edit Plan"}
            </button>
          )}
        </div>
      </div>
      <p
        id={descriptionId}
        className={editing ? "sort-explanation" : "visually-hidden"}
      >
        {editing
          ? pauseText
          : "Activate a column to sort. Activate it again to reverse direction. Sorting changes the view only."}
      </p>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
      <div role="table" aria-label={title} aria-describedby={descriptionId}>
        <div role="rowgroup">
          <div className="task-head" role="row">
            {(
              [
                ["task", "Task"],
                ["weight", "Weight"],
                ["status", "Status"],
              ] as const
            ).map(([column, label]) => (
              <div
                key={column}
                role="columnheader"
                aria-sort={sort?.column === column ? sort.direction : undefined}
              >
                <button
                  type="button"
                  className={`sort-header ${column === "task" ? "" : "sort-header-icon"}`}
                  aria-label={`Sort by ${label}`}
                  title={label}
                  aria-describedby={descriptionId}
                  disabled={editing}
                  ref={(node) => {
                    if (node) headerRefs.current.set(column, node);
                    else headerRefs.current.delete(column);
                  }}
                  onClick={() => {
                    const next = nextSort(sort, column);
                    setSort(next);
                    announce(`${label} sorted ${next.direction}.`);
                  }}
                >
                  {column === "task" ? (
                    <span>{label}</span>
                  ) : (
                    <svg
                      className="column-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      {column === "weight" ? (
                        <>
                          <circle cx="12" cy="5" r="3" />
                          <path d="M6.5 8h11L21 21H3L6.5 8Z" />
                        </>
                      ) : (
                        <>
                          <circle cx="12" cy="12" r="9" />
                          <path d="m8 12 3 3 5-6" />
                        </>
                      )}
                    </svg>
                  )}
                  {sort?.column === column && (
                    <svg
                      className="sort-indicator"
                      viewBox="0 0 12 12"
                      width="10"
                      height="10"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {sort.direction === "ascending" ? (
                        <path d="M6 10V2M3 5l3-3 3 3" />
                      ) : (
                        <path d="M6 2v8M3 7l3 3 3-3" />
                      )}
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {tasks.length === 0 && (
            <div role="row">
              <div role="cell" aria-colspan={3}>
                <p className="empty">
                  Make room for what matters.
                  <br />
                  <span>Add your first task to plan this day.</span>
                </p>
              </div>
            </div>
          )}
          {displayed.map((t) => (
            <div className="task-row" key={t.id} role="row" data-task-id={t.id}>
              <div className="task-title" role="cell">
                <div className="task-title-main">
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
                    <span>{t.title}</span>
                  )}
                </div>
                <span className="task-category">
                  {t.category?.name ?? "Uncategorized"}
                </span>
                {linkedIds.includes(t.id) && (
                  <span
                    className="visually-hidden"
                    id={`things-authority-${t.id}`}
                  >
                    Things controls completion on sync
                  </span>
                )}
              </div>
              <div role="cell">
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
                  <span className={"badge " + t.weightLabel}>
                    {t.weightLabel}
                  </span>
                )}
              </div>
              <div role="cell" className="task-status-cell">
                <input
                  className="status-check"
                  type="checkbox"
                  aria-label={`Complete ${t.title}`}
                  aria-describedby={
                    linkedIds.includes(t.id)
                      ? `things-authority-${t.id}`
                      : undefined
                  }
                  checked={t.completed}
                  disabled={disabled}
                  ref={(node) => {
                    if (node) checkboxRefs.current.set(t.id, node);
                    else checkboxRefs.current.delete(t.id);
                  }}
                  onChange={(ev) => {
                    if (document.activeElement === ev.currentTarget)
                      focusOrigin.current = {
                        id: t.id,
                        element: ev.currentTarget,
                      };
                    patch(t.id, { completed: !t.completed });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
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
