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
  category: null,
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
it("preserves category through ordinary edits and rejects forged category", async () => {
  const category = { sourceId: "project-a", name: "Travel" };
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async (ids) => ({
        candidates: [{ ...source, category }],
        tracked: ids.map((id) => ({ ...source, sourceId: id, category })),
      }),
    },
  });
  const first = await post({
    requestId: crypto.randomUUID(),
    expectedRevision: 0,
  });
  expect(first.body.day.plan.tasks[0].category).toEqual(category);
  const task = first.body.day.plan.tasks[0];
  const editable = {
    id: task.id,
    title: "Local title",
    weightLabel: "M",
    completed: true,
  };
  const saved = await request(app)
    .put("/api/days/2026-10-31")
    .set("Host", "127.0.0.1:3001")
    .send({
      requestId: crypto.randomUUID(),
      expectedRevision: 1,
      tasks: [editable],
    });
  expect(saved.status).toBe(200);
  expect(saved.body.plan.tasks[0]).toMatchObject({
    ...editable,
    category,
    weightPoints: 5,
  });
  const forged = await request(app)
    .put("/api/days/2026-10-31")
    .set("Host", "127.0.0.1:3001")
    .send({
      requestId: crypto.randomUUID(),
      expectedRevision: 2,
      tasks: [
        { ...editable, category: { sourceId: "forged", name: "Forged" } },
      ],
    });
  expect(forged.status).toBe(400);
});
it("refreshes ten tasks across projects without changing identity, weights or finalized history", async () => {
  let phase = 0;
  const candidates = () =>
    Array.from({ length: 10 }, (_, i) => ({
      ...source,
      sourceId: "task-" + i,
      title: "Task " + i,
      category:
        i === 9
          ? null
          : {
              sourceId: "project-" + (i % 3),
              name: phase ? "Renamed " + (i % 3) : "Project " + (i % 3),
            },
    }));
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async (ids) => ({
        candidates: candidates(),
        tracked: ids.map((id) => candidates().find((t) => t.sourceId === id)!),
      }),
    },
  });
  const initial = await post({
    requestId: crypto.randomUUID(),
    expectedRevision: 0,
  });
  expect(initial.body.sync.addedCount).toBe(10);
  const identities = initial.body.day.plan.tasks.map((t: any) => [
    t.id,
    t.weightPoints,
  ]);
  let latest = initial;
  for (let i = 0; i < 10; i++) {
    phase = i + 1;
    latest = await post({
      requestId: crypto.randomUUID(),
      expectedRevision: latest.body.day.plan.revision,
    });
    expect(latest.status).toBe(200);
    expect(latest.body.sync.addedCount).toBe(0);
    expect(latest.body.sync.updatedCount).toBe(i === 0 ? 9 : 0);
    expect(
      latest.body.day.plan.tasks.map((t: any) => [t.id, t.weightPoints]),
    ).toEqual(identities);
  }
  await request(app)
    .post("/api/days/2026-10-31/finalize")
    .set("Host", "127.0.0.1:3001")
    .send({ requestId: crypto.randomUUID(), expectedRevision: 11 });
  const before = db
    .prepare("SELECT record FROM days WHERE date=?")
    .get("2026-10-31");
  phase = 0;
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 12 }))
      .status,
  ).toBe(409);
  expect(
    db.prepare("SELECT record FROM days WHERE date=?").get("2026-10-31"),
  ).toEqual(before);
});
it("leaves all persisted category state unchanged on malformed category or failed apply", async () => {
  let bad = false;
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async (ids) =>
        ({
          candidates: [
            {
              ...source,
              category: bad
                ? { sourceId: "p" }
                : { sourceId: "p", name: "Travel" },
            },
          ],
          tracked: ids.map((id) => ({
            ...source,
            sourceId: id,
            category: { sourceId: "p", name: "Renamed" },
          })),
        }) as any,
    },
  });
  await post({ requestId: crypto.randomUUID(), expectedRevision: 0 });
  const snapshot = () =>
    ["days", "things_links", "things_sync_state", "receipts"].map((table) =>
      db.prepare("SELECT * FROM " + table).all(),
    );
  const before = snapshot();
  bad = true;
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 1 }))
      .status,
  ).toBe(502);
  expect(snapshot()).toEqual(before);
  bad = false;
  db.exec(
    "CREATE TRIGGER category_fail BEFORE UPDATE ON things_sync_state BEGIN SELECT RAISE(ABORT,'fixture'); END;",
  );
  expect(
    (await post({ requestId: crypto.randomUUID(), expectedRevision: 1 }))
      .status,
  ).toBe(500);
  expect(snapshot()).toEqual(before);
});
it("retains canceled categories without resolving them while other tasks still update", async () => {
  let canceled = false;
  const category = { sourceId: "p", name: "Travel" };
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async (ids) => ({
        candidates: [
          { ...source, category },
          { ...source, sourceId: "second", category: null },
        ],
        tracked: ids.map((id) => ({
          ...source,
          sourceId: id,
          status:
            canceled && id === source.sourceId
              ? ("canceled" as const)
              : ("completed" as const),
          category: canceled && id === source.sourceId ? undefined : category,
        })),
      }),
    },
  });
  await post({ requestId: crypto.randomUUID(), expectedRevision: 0 });
  canceled = true;
  const next = await post({
    requestId: crypto.randomUUID(),
    expectedRevision: 1,
  });
  expect(next.status).toBe(200);
  expect(next.body.sync.unresolvedCount).toBe(1);
  expect(next.body.day.plan.tasks[0]).toMatchObject({
    category,
    completed: false,
  });
  expect(next.body.day.plan.tasks[1].completed).toBe(true);
});
it("loads legacy tasks without rewriting them and reimports removed links with current categories", async () => {
  const category = { sourceId: "p", name: "Travel" };
  app = createApp(db, {
    clock: () => now,
    reader: {
      readSnapshot: async (ids) => ({
        candidates: [{ ...source, category }],
        tracked: ids.map((id) => ({ ...source, sourceId: id, category })),
      }),
    },
  });
  const first = await post({
    requestId: crypto.randomUUID(),
    expectedRevision: 0,
  });
  const oldId = first.body.day.plan.tasks[0].id;
  await request(app)
    .put("/api/days/2026-10-31")
    .set("Host", "127.0.0.1:3001")
    .send({ requestId: crypto.randomUUID(), expectedRevision: 1, tasks: [] });
  expect(db.prepare("SELECT * FROM things_links").all()).toHaveLength(0);
  const again = await post({
    requestId: crypto.randomUUID(),
    expectedRevision: 2,
  });
  expect(again.body.day.plan.tasks).toHaveLength(1);
  expect(again.body.day.plan.tasks[0]).toMatchObject({ category });
  expect(again.body.day.plan.tasks[0].id).not.toBe(oldId);
  const record = JSON.parse(
    (
      db
        .prepare("SELECT record FROM days WHERE date=?")
        .get("2026-10-31") as any
    ).record,
  );
  delete record.tasks[0].category;
  const raw = JSON.stringify(record);
  db.prepare("UPDATE days SET record=? WHERE date=?").run(raw, "2026-10-31");
  const env = await request(app)
    .get("/api/days/2026-10-31")
    .set("Host", "127.0.0.1:3001");
  expect(env.body.plan.tasks[0]).not.toHaveProperty("category");
  expect(
    (
      db
        .prepare("SELECT record FROM days WHERE date=?")
        .get("2026-10-31") as any
    ).record,
  ).toBe(raw);
  expect(
    (
      await post(
        { requestId: first.body.sync.requestId, expectedRevision: 0 },
        true,
      )
    ).body,
  ).toEqual(first.body);
  expect(db.pragma("user_version", { simple: true })).toBe(2);
});
