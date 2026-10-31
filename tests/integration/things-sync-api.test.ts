import { it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../../src/server/app";
import { openDatabase } from "../../src/server/db/database";
let db: ReturnType<typeof openDatabase>,
  app: ReturnType<typeof createApp>,
  dir: string,
  reads: number,
  now: Date;
let fail = false;
const source = {
  sourceId: "source-a",
  title: "Imported",
  tags: ["❗️", "🔴 XL"],
  status: "open" as const,
  inToday: true,
  inTrash: false,
};
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "centcom-sync-test-"));
  db = openDatabase(join(dir, "db.sqlite"));
  reads = 0;
  fail = false;
  now = new Date("2026-10-31T16:00:00Z");
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async (ids: string[]) => {
        reads++;
        if (fail) throw new Error("source unavailable");
        return {
          candidates: [source],
          tracked: ids.map((id) => ({
            ...source,
            sourceId: id,
            status: "completed",
            inToday: false,
          })),
        };
      },
    },
  });
});
afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
function post(body: any, recover = false) {
  return request(app)
    .post("/api/days/2026-10-31/things-sync" + (recover ? "/recover" : ""))
    .set("Host", "127.0.0.1:3001")
    .send(body);
}
it("imports exactly once, source completion wins, and recovers after midnight without reads", async () => {
  const body = { requestId: crypto.randomUUID(), expectedRevision: 0 };
  const first = await post(body);
  expect(first.status).toBe(200);
  expect(first.body.day.plan.tasks[0].weightPoints).toBe(20);
  expect((await post(body)).body).toEqual(first.body);
  expect(reads).toBe(1);
  const next = await post({
    requestId: crypto.randomUUID(),
    expectedRevision: 1,
  });
  expect(next.body.day.result.scorePercent).toBe(20);
  now = new Date("2026-11-02T16:00:00Z");
  expect((await post(body, true)).body).toEqual(first.body);
  expect(reads).toBe(2);
});
it("rejects new ineligible requests and recovery does not fall through", async () => {
  now = new Date("2026-11-01T16:00:00Z");
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 0 }))
      .status,
  ).toBe(409);
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 0 }, true))
      .body.error.code,
  ).toBe("SYNC_NOT_COMMITTED");
  expect(reads).toBe(0);
});
it("preserves links through ordinary edits, fails atomically, and distinguishes zero changes", async () => {
  await post({ requestId: crypto.randomUUID(), expectedRevision: 0 });
  const env = (
    await request(app).get("/api/days/2026-10-31").set("Host", "127.0.0.1:3001")
  ).body;
  const task = env.plan.tasks[0];
  await request(app)
    .put("/api/days/2026-10-31")
    .set("Host", "127.0.0.1:3001")
    .send({
      requestId: crypto.randomUUID(),
      expectedRevision: 1,
      tasks: [
        { id: task.id, title: "Local name", weightLabel: "M", completed: true },
      ],
    });
  fail = true;
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 2 }))
      .status,
  ).toBe(502);
  const after = (
    await request(app).get("/api/days/2026-10-31").set("Host", "127.0.0.1:3001")
  ).body;
  expect(after.things.taskLinks).toHaveLength(1);
  expect(after.plan.revision).toBe(2);
  expect(after.plan.tasks[0].weightPoints).toBe(5);
});
it("GET and lifecycle never read Things", async () => {
  await request(app).get("/api/days/2026-10-31").set("Host", "127.0.0.1:3001");
  await request(app).get("/api/months/2026-10").set("Host", "127.0.0.1:3001");
  expect(reads).toBe(0);
});
it("finalized days reject before reads and receipt replay ignores later lifecycle", async () => {
  const body = { requestId: crypto.randomUUID(), expectedRevision: 0 };
  const first = await post(body);
  await request(app)
    .post("/api/days/2026-10-31/finalize")
    .set("Host", "127.0.0.1:3001")
    .send({ requestId: crypto.randomUUID(), expectedRevision: 1 });
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 2 })).body
      .error.code,
  ).toBe("INVALID_STATE");
  expect((await post(body, true)).body).toEqual(first.body);
  expect(reads).toBe(1);
});
it("rollback includes links, state and receipt on failed sync persistence", async () => {
  db.exec(
    "CREATE TRIGGER fail_state BEFORE INSERT ON things_sync_state BEGIN SELECT RAISE(ABORT,'fixture'); END;",
  );
  const r = await post({ requestId: crypto.randomUUID(), expectedRevision: 0 });
  expect(r.status).toBe(500);
  for (const table of ["days", "things_links", "things_sync_state", "receipts"])
    expect(db.prepare("SELECT count(*) n FROM " + table).get()).toEqual({
      n: 0,
    });
});
it("overlapping operations reject and a finalization during read prevents commit", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((r) => {
    release = r;
  });
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async () => {
        reads++;
        await blocked;
        return { candidates: [source], tracked: [] };
      },
    },
  });
  const body = { requestId: crypto.randomUUID(), expectedRevision: 0 };
  const running = post(body).then((r) => r);
  while (!reads) await new Promise((r) => setTimeout(r, 5));
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 0 })).body
      .error.code,
  ).toBe("SYNC_IN_PROGRESS");
  expect((await post(body, true)).body.error.code).toBe("SYNC_IN_PROGRESS");
  await request(app)
    .post("/api/days/2026-10-31/finalize")
    .set("Host", "127.0.0.1:3001")
    .send({ requestId: crypto.randomUUID(), expectedRevision: 0 });
  release();
  expect((await running).body.error.code).toBe("INVALID_STATE");
  expect(db.prepare("SELECT count(*) n FROM things_links").get()).toEqual({
    n: 0,
  });
});
it("replays persisted sync receipts across database restart", async () => {
  const body = { requestId: crypto.randomUUID(), expectedRevision: 0 },
    first = await post(body);
  db.close();
  db = openDatabase(join(dir, "db.sqlite"));
  app = createApp(db, {
    reader: {
      readSnapshot: async () => {
        throw new Error("must not read");
      },
    },
    clock: () => new Date("2026-11-02T16:00:00Z"),
  });
  expect((await post(body, true)).body).toEqual(first.body);
});
it("a midnight rollover while reading rejects the entire merge", async () => {
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async () => {
        now = new Date("2026-11-01T16:00:00Z");
        return { candidates: [source], tracked: [] };
      },
    },
  });
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 0 })).body
      .error.code,
  ).toBe("WRONG_SYNC_DATE");
  expect(db.prepare("SELECT count(*) n FROM days").get()).toEqual({ n: 0 });
});
it("malformed snapshots fail as source reads rather than invalid user input", async () => {
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async () =>
        ({ candidates: [{ ...source, status: "bad" }], tracked: [] }) as any,
    },
  });
  const r = await post({ requestId: crypto.randomUUID(), expectedRevision: 0 });
  expect(r.status).toBe(502);
  expect(r.body.error.code).toBe("THINGS_READ_FAILED");
  expect(db.prepare("SELECT count(*) n FROM days").get()).toEqual({ n: 0 });
});
