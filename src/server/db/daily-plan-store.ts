import { createHash } from "node:crypto";
import type { DB } from "./database";
import {
  emptyPlan,
  weights,
  type Plan,
  type Envelope,
} from "../../domain/daily-plan";
import { result } from "../../domain/scoring";
import { saveInput, transitionInput } from "../../domain/validation";
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function readDay(db: DB, date: string): Envelope {
  const row = db.prepare("SELECT record FROM days WHERE date=?").get(date) as
    { record: string } | undefined;
  const plan: Plan = row ? JSON.parse(row.record) : emptyPlan(date);
  if (plan.schemaVersion !== 1 || plan.scoreRule !== "fixed-budget-v1")
    throw new Error("Unsupported saved record");
  const taskLinks = db
    .prepare("SELECT task_id,source_id FROM things_links WHERE date=?")
    .all(date) as { task_id: string; source_id: string }[];
  const state = db
    .prepare("SELECT record FROM things_sync_state WHERE date=?")
    .get(date) as { record: string } | undefined;
  return {
    plan,
    result: result(plan.tasks),
    things: {
      taskLinks,
      lastSuccessfulSync: state ? JSON.parse(state.record) : null,
    },
  };
}
export function monthDays(db: DB, month: string) {
  return {
    month,
    days: (
      db
        .prepare("SELECT record FROM days WHERE date LIKE ? ORDER BY date")
        .all(month + "-%") as { record: string }[]
    ).map((row) => {
      const p: Plan = JSON.parse(row.record);
      return {
        date: p.date,
        status: p.status,
        scorePercent: result(p.tasks).scorePercent,
      };
    }),
  };
}
export function mutate(
  db: DB,
  date: string,
  action: "save" | "finalize" | "reopen",
  raw: unknown,
): Envelope {
  const body = (action === "save" ? saveInput : transitionInput).parse(raw);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([date, action, body]))
    .digest("hex");
  return db.transaction(() => {
    const receipt = db
      .prepare("SELECT * FROM receipts WHERE id=?")
      .get(body.requestId) as
      { fingerprint: string; response: string } | undefined;
    if (receipt) {
      if (receipt.fingerprint !== fingerprint)
        throw new AppError(
          "REQUEST_ID_REUSED",
          409,
          "This request identifier has different input.",
        );
      return JSON.parse(receipt.response);
    }
    const current = readDay(db, date).plan;
    if (current.revision !== body.expectedRevision)
      throw new AppError(
        "REVISION_CONFLICT",
        409,
        "This day changed in another tab. Reload to review the saved version.",
      );
    if (
      (action === "reopen" && current.status !== "finalized") ||
      (action !== "reopen" && current.status === "finalized")
    )
      throw new AppError(
        "INVALID_STATE",
        409,
        "Reopen a finalized day before editing.",
      );
    const now = new Date().toISOString();
    const plan: Plan = {
      ...current,
      revision: current.revision + 1,
      createdAt: current.createdAt ?? now,
      updatedAt: now,
    };
    if (action === "save") {
      const input = saveInput.parse(body);
      plan.tasks = input.tasks.map((t) => {
        const old = current.tasks.find((o) => o.id === t.id);
        return {
          ...t,
          weightPoints:
            old?.weightLabel === t.weightLabel
              ? old.weightPoints
              : weights[t.weightLabel],
        };
      });
    }
    if (action === "finalize") {
      plan.status = "finalized";
      plan.finalizedAt = now;
    }
    if (action === "reopen") {
      plan.status = "editable";
      plan.finalizedAt = null;
    }
    db.prepare(
      "INSERT INTO days(date,record) VALUES (?,?) ON CONFLICT(date) DO UPDATE SET record=excluded.record",
    ).run(date, JSON.stringify(plan));
    for (const link of db
      .prepare("SELECT task_id FROM things_links WHERE date=?")
      .all(date) as { task_id: string }[]) {
      if (!plan.tasks.some((t) => t.id === link.task_id))
        db.prepare("DELETE FROM things_links WHERE date=? AND task_id=?").run(
          date,
          link.task_id,
        );
    }
    const enriched = readDay(db, date);
    db.prepare(
      "INSERT INTO receipts(id,fingerprint,response) VALUES (?,?,?)",
    ).run(body.requestId, fingerprint, JSON.stringify(enriched));
    return enriched;
  })();
}
