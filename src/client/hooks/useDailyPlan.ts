import { useEffect, useReducer, useRef, useState } from "react";
import { api, ApiError } from "../api/daily-plans";
import {
  emptyPlan,
  type Envelope,
  type Plan,
  type Task,
} from "../../domain/daily-plan";
import { today } from "../../domain/dates";
interface Entry {
  started?: boolean;
  plan: Plan;
  ack: Plan;
  loading: boolean;
  loadError: string;
  saveError: string;
  dirty: boolean;
  version: number;
  pending: boolean;
  flight?: Promise<void>;
  request?: { path: string; body: unknown; method: string; version: number };
  timer?: ReturnType<typeof setTimeout>;
}
export function useDailyPlan() {
  const [date, setDate] = useState(today);
  const [tick, notify] = useReducer((x) => x + 1, 0);
  const entries = useRef(new Map<string, Entry>());
  const [savedTick, saved] = useReducer((x) => x + 1, 0);
  function entry(d: string) {
    let e = entries.current.get(d);
    if (!e) {
      e = {
        plan: emptyPlan(d),
        ack: emptyPlan(d),
        loading: true,
        loadError: "",
        saveError: "",
        dirty: false,
        version: 0,
        pending: false,
      };
      entries.current.set(d, e);
    }
    return e;
  }
  async function load(d: string) {
    const e = entry(d);
    e.started = true;
    e.loading = true;
    e.loadError = "";
    notify();
    try {
      const env = await api<Envelope>("/days/" + d);
      e.plan = env.plan;
      e.ack = env.plan;
      e.dirty = false;
      e.request = undefined;
      e.saveError = "";
    } catch (err) {
      e.loadError = (err as Error).message;
    } finally {
      e.loading = false;
      notify();
    }
  }
  useEffect(() => {
    if (!entry(date).started) void load(date);
  }, [date]); // each date loads once; drafts stay in memory
  const e = entry(date);
  async function flush(d: string): Promise<void> {
    const x = entry(d);
    if (x.flight) return x.flight;
    if (x.loading || x.loadError)
      throw new Error("Load the day before saving.");
    if (!x.dirty && !x.request) return;
    x.pending = true;
    x.saveError = "";
    notify();
    x.flight = (async () => {
      try {
        while (x.dirty || x.request) {
          if (!x.request) {
            const tasks = x.plan.tasks.map(
              ({ id, title, weightLabel, completed }) => ({
                id,
                title,
                weightLabel,
                completed,
              }),
            );
            x.request = {
              path: "/days/" + d,
              body: {
                requestId: crypto.randomUUID(),
                expectedRevision: x.ack.revision,
                tasks,
              },
              method: "PUT",
              version: x.version,
            };
          }
          const req = x.request;
          const env = await api<Envelope>(req.path, req.body, req.method);
          x.ack = env.plan;
          if (x.version === req.version) {
            x.plan = env.plan;
            x.dirty = false;
          } else {
            x.plan = { ...env.plan, tasks: x.plan.tasks };
          }
          x.request = undefined;
          saved();
        }
      } catch (err) {
        x.saveError = (err as Error).message;
        if (
          err instanceof ApiError &&
          ["REVISION_CONFLICT", "INVALID_STATE", "REQUEST_ID_REUSED"].includes(
            err.code,
          )
        ) {
          x.saveError = "Conflict: " + err.message;
        }
        throw err;
      } finally {
        x.pending = false;
        x.flight = undefined;
        notify();
      }
    })();
    return x.flight;
  }
  function edit(tasks: Task[]) {
    if (e.loading || e.loadError || e.plan.status === "finalized") return;
    e.plan = { ...e.plan, tasks };
    e.version++;
    e.dirty = true;
    clearTimeout(e.timer);
    if (!e.saveError)
      e.timer = setTimeout(() => {
        void flush(date).catch(() => {});
      }, 300);
    notify();
  }
  async function transition(action: "finalize" | "reopen") {
    if (e.pending) return;
    try {
      if (!e.request?.path.match(/finalize|reopen/)) await flush(date);
      e.pending = true;
      notify();
      const req = e.request ?? {
        path: `/days/${date}/${action}`,
        body: {
          requestId: crypto.randomUUID(),
          expectedRevision: e.ack.revision,
        },
        method: "POST",
        version: e.version,
      };
      e.request = req;
      const env = await api<Envelope>(req.path, req.body, req.method);
      e.plan = env.plan;
      e.ack = env.plan;
      e.request = undefined;
      e.saveError = "";
      saved();
    } catch (err) {
      e.saveError = (err as Error).message;
    } finally {
      e.pending = false;
      notify();
    }
  }
  function retry() {
    if (e.request?.path.endsWith("/finalize")) {
      void transition("finalize");
      return;
    }
    if (e.request?.path.endsWith("/reopen")) {
      void transition("reopen");
      return;
    }
    void flush(date).catch(() => {});
  }
  useEffect(() => {
    const warn = (ev: BeforeUnloadEvent) => {
      if ([...entries.current.values()].some((x) => x.dirty || x.request)) {
        ev.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return {
    date,
    setDate,
    entry: e,
    edit,
    transition,
    retry,
    reload: () => {
      if (
        (e.dirty || e.request) &&
        !confirm("Discard unsaved changes and load the saved day?")
      )
        return;
      clearTimeout(e.timer);
      void load(date);
    },
    savedTick,
    tick,
  };
}
