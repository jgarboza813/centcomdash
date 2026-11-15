import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/daily-plans";
import { today } from "../../domain/dates";
import { isStreakSummary, type StreakSummary } from "../../domain/streaks";
export interface StreakState {
  data?: StreakSummary;
  phase: "loading" | "ready" | "refreshing" | "error";
  error?: string;
}
export function useStreaks(savedTick: number) {
  const [state, setState] = useState<StreakState>({ phase: "loading" });
  const generation = useRef(0);
  const active = useRef<
    | { controller: AbortController; timer: ReturnType<typeof setTimeout> }
    | undefined
  >(undefined);
  const observedDate = useRef(today());
  const refresh = useCallback(() => {
    const id = ++generation.current;
    if (active.current) {
      clearTimeout(active.current.timer);
      active.current.controller.abort();
    }
    const controller = new AbortController();
    setState((s) => ({
      ...s,
      phase: s.data ? "refreshing" : "loading",
      error: undefined,
    }));
    const fail = (message: string) => {
      if (generation.current === id)
        setState((s) => ({ ...s, phase: "error", error: message }));
    };
    const timer = setTimeout(() => {
      fail("Streak request timed out. Please retry.");
      ++generation.current;
      controller.abort();
      active.current = undefined;
    }, 15_000);
    active.current = { controller, timer };
    void api<unknown>("/streaks", undefined, "GET", controller.signal)
      .then((data) => {
        if (!isStreakSummary(data))
          throw new Error("Invalid streak summary. Please retry.");
        if (generation.current === id) setState({ data, phase: "ready" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) fail((error as Error).message);
      })
      .finally(() => {
        clearTimeout(timer);
        if (generation.current === id) active.current = undefined;
      });
  }, []);
  // A new acknowledgment always invalidates any read started before that mutation.
  useEffect(() => {
    refresh();
  }, [savedTick, refresh]);
  useEffect(() => {
    let lastResume = -Infinity;
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      const date = today();
      if (
        date === observedDate.current &&
        now >= lastResume &&
        now - lastResume < 250
      )
        return;
      lastResume = now;
      observedDate.current = date;
      refresh();
    };
    const interval = setInterval(() => {
      const date = today();
      if (
        document.visibilityState !== "hidden" &&
        date !== observedDate.current
      ) {
        observedDate.current = date;
        refresh();
      }
    }, 30_000);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      ++generation.current;
      if (active.current) {
        clearTimeout(active.current.timer);
        active.current.controller.abort();
        active.current = undefined;
      }
    };
  }, [refresh]);
  return { ...state, retry: refresh };
}
