import { createHash } from "node:crypto";
import { z } from "zod";
import type { DB } from "../db/database";
import { AppError, readDay } from "../db/daily-plan-store";
import { today } from "../../domain/dates";
import { transitionInput } from "../../domain/validation";
import { mergeThings, sourceTask } from "../../domain/things-sync";
import type { SyncResult } from "../../domain/daily-plan";
import type { ThingsReader } from "./things-reader";
export function createSyncService(
  db: DB,
  reader: ThingsReader,
  clock = () => new Date(),
) {
  const active = new Set<string>();
  function receipt(date: string, raw: unknown) {
    const b = transitionInput.parse(raw);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(["things-sync", date, b]))
      .digest("hex");
    const saved = db
      .prepare("SELECT fingerprint,response FROM receipts WHERE id=?")
      .get(b.requestId) as
      { fingerprint: string; response: string } | undefined;
    if (saved && saved.fingerprint !== fingerprint)
      throw new AppError(
        "REQUEST_ID_REUSED",
        409,
        "Request identifier has different input.",
      );
    return { b, fingerprint, saved: saved ? JSON.parse(saved.response) : null };
  }
  function eligible(date: string, rev: number) {
    const env = readDay(db, date);
    if (date !== today(clock()))
      throw new AppError(
        "WRONG_SYNC_DATE",
        409,
        "Sync is available only for today.",
      );
    if (env.plan.status === "finalized")
      throw new AppError("INVALID_STATE", 409, "Reopen today before syncing.");
    if (env.plan.revision !== rev)
      throw new AppError(
        "REVISION_CONFLICT",
        409,
        "This day changed. Reload before syncing.",
      );
    return env;
  }
  return {
    recover(date: string, raw: unknown) {
      const r = receipt(date, raw);
      if (r.saved) return r.saved;
      throw new AppError(
        active.has(date) ? "SYNC_IN_PROGRESS" : "SYNC_NOT_COMMITTED",
        409,
        active.has(date)
          ? "The previous sync is still running."
          : "The previous sync was not committed.",
      );
    },
    async sync(date: string, raw: unknown) {
      const r = receipt(date, raw);
      if (r.saved) return r.saved;
      if (active.has(date))
        throw new AppError(
          "SYNC_IN_PROGRESS",
          409,
          "A sync is already running.",
        );
      const env = eligible(date, r.b.expectedRevision);
      active.add(date);
      try {
        const ids = env.things!.taskLinks.map((l) => l.source_id);
        let snapshot;
        try {
          snapshot = await reader.readSnapshot(ids);
        } catch (err) {
          if (err instanceof AppError) throw err;
          throw new AppError(
            "THINGS_READ_FAILED",
            502,
            "Things could not be read. Click Sync with Things to retry.",
          );
        }
        const parsed = z
          .object({
            candidates: z.array(sourceTask),
            tracked: z.array(
              z.union([
                sourceTask,
                z
                  .object({
                    sourceId: z.string().min(1),
                    missing: z.literal(true),
                  })
                  .strict(),
              ]),
            ),
          })
          .safeParse(snapshot);
        if (!parsed.success)
          throw new AppError(
            "THINGS_READ_FAILED",
            502,
            "Things returned an invalid snapshot. No changes were applied.",
          );
        const { candidates, tracked } = parsed.data;
        if (
          new Set(candidates.map((t) => t.sourceId)).size !==
            candidates.length ||
          new Set(tracked.map((t) => t.sourceId)).size !== tracked.length ||
          tracked.length !== ids.length ||
          ids.some((id) => !tracked.some((t) => t.sourceId === id))
        )
          throw new AppError(
            "THINGS_READ_FAILED",
            502,
            "Things returned an incomplete snapshot.",
          );
        return db.transaction(() => {
          const current = eligible(date, r.b.expectedRevision);
          const merged = mergeThings(
            current.plan,
            current.things!.taskLinks,
            candidates,
            tracked,
          );
          const completedAt = clock().toISOString();
          const plan = {
            ...current.plan,
            tasks: merged.tasks,
            revision: current.plan.revision + 1,
            createdAt: current.plan.createdAt ?? completedAt,
            updatedAt: completedAt,
          };
          const sync: SyncResult = {
            requestId: r.b.requestId,
            targetDate: date,
            completedAt,
            addedCount: merged.addedCount,
            updatedCount: merged.updatedCount,
            unresolvedCount: merged.unresolvedCount,
            unresolved: merged.unresolved,
          };
          db.prepare(
            "INSERT INTO days(date,record) VALUES (?,?) ON CONFLICT(date) DO UPDATE SET record=excluded.record",
          ).run(date, JSON.stringify(plan));
          db.prepare("DELETE FROM things_links WHERE date=?").run(date);
          for (const l of merged.links)
            db.prepare("INSERT INTO things_links VALUES (?,?,?)").run(
              date,
              l.task_id,
              l.source_id,
            );
          db.prepare(
            "INSERT INTO things_sync_state VALUES (?,?) ON CONFLICT(date) DO UPDATE SET record=excluded.record",
          ).run(date, JSON.stringify(sync));
          const response = { day: readDay(db, date), sync };
          db.prepare("INSERT INTO receipts VALUES (?,?,?)").run(
            r.b.requestId,
            r.fingerprint,
            JSON.stringify(response),
          );
          return response;
        })();
      } finally {
        active.delete(date);
      }
    },
  };
}
