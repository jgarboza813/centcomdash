import { afterEach, beforeEach, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../src/server/app";
import { openDatabase } from "../../src/server/db/database";
let dir: string,
  db: ReturnType<typeof openDatabase>,
  app: ReturnType<typeof createApp>;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "centcom-test-"));
  db = openDatabase(join(dir, "test.sqlite"));
  app = createApp(db);
});
afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
const date = "2026-10-31";
const tasks = [
  { id: crypto.randomUUID(), title: "Gym", weightLabel: "XL", completed: true },
];
const mutation = (revision: number) => ({
  requestId: crypto.randomUUID(),
  expectedRevision: revision,
  tasks,
});
function api() {
  return request(app);
}
function put(body: any) {
  return api()
    .put(`/api/days/${date}`)
    .set("Host", "127.0.0.1:3001")
    .send(body);
}
function post(action: string, body: any) {
  return api()
    .post(`/api/days/${date}/${action}`)
    .set("Host", "127.0.0.1:3001")
    .send(body);
}
it("GET creates no data and PUT persists one complete snapshot", async () => {
  expect(
    (await api().get(`/api/days/${date}`).set("Host", "127.0.0.1:3001")).body
      .plan.revision,
  ).toBe(0);
  expect(db.prepare("select count(*) n from days").get()).toEqual({ n: 0 });
  const r = await put(mutation(0));
  expect(r.status).toBe(200);
  expect(r.body.result.scorePercent).toBe(20);
  db.close();
  db = openDatabase(join(dir, "test.sqlite"));
  app = createApp(db);
  expect(
    (await api().get(`/api/days/${date}`).set("Host", "127.0.0.1:3001")).body
      .plan.tasks[0].id,
  ).toBe(tasks[0].id);
});
it("replays lost responses, rejects stale revisions and changed request reuse", async () => {
  const body = mutation(0);
  const a = await put(body);
  expect((await put(body)).body).toEqual(a.body);
  expect((await put(mutation(0))).status).toBe(409);
  expect((await put({ ...body, tasks: [] })).body.error.code).toBe(
    "REQUEST_ID_REUSED",
  );
});
it("finalizes, rejects edits, reopens, and preserves the score", async () => {
  await put(mutation(0));
  const fin = await post("finalize", {
    requestId: crypto.randomUUID(),
    expectedRevision: 1,
  });
  expect(fin.body.plan.status).toBe("finalized");
  expect((await put(mutation(2))).body.error.code).toBe("INVALID_STATE");
  const month = await api()
    .get("/api/months/2026-10")
    .set("Host", "127.0.0.1:3001");
  expect(month.body.days[0].scorePercent).toBe(20);
  expect(
    (
      await post("reopen", {
        requestId: crypto.randomUUID(),
        expectedRevision: 2,
      })
    ).body.plan.status,
  ).toBe("editable");
});
it("finalizes empty days without completing tasks", async () => {
  const r = await post("finalize", {
    requestId: crypto.randomUUID(),
    expectedRevision: 0,
  });
  expect(r.body.result.scorePercent).toBeNull();
});
it("rejects invalid input, foreign origins and unknown fields", async () => {
  expect(
    (await put({ ...mutation(0), tasks: [{ ...tasks[0], title: " " }] }))
      .status,
  ).toBe(400);
  expect((await put({ ...mutation(0), score: 100 })).status).toBe(400);
  expect(
    (
      await api()
        .put(`/api/days/${date}`)
        .set("Host", "127.0.0.1:3001")
        .set("Origin", "https://evil.example")
        .send(mutation(0))
    ).status,
  ).toBe(403);
});
it("rolls back days and receipts together on disk-write failure", async () => {
  db.exec(
    "CREATE TRIGGER reject_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
  );
  expect((await put(mutation(0))).status).toBe(500);
  expect(db.prepare("select count(*) n from days").get()).toEqual({ n: 0 });
});
it("keeps days separate and exposes zero/null/month boundaries", async () => {
  await put(mutation(0));
  const other = "2026-11-01";
  await api()
    .put("/api/days/" + other)
    .set("Host", "127.0.0.1:3001")
    .send({ ...mutation(0), tasks: [] });
  const oct = (
    await api().get("/api/months/2026-10").set("Host", "127.0.0.1:3001")
  ).body;
  expect(oct.days).toHaveLength(1);
  expect(oct.days[0].date).toBe(date);
  expect(
    (
      await api()
        .get("/api/days/" + other)
        .set("Host", "127.0.0.1:3001")
    ).body.result.scorePercent,
  ).toBeNull();
  expect(
    (await api().get("/api/months/2026-13").set("Host", "127.0.0.1:3001"))
      .status,
  ).toBe(400);
});
it("replays mutation receipts after closing the database", async () => {
  const body = mutation(0),
    first = await put(body);
  db.close();
  db = openDatabase(join(dir, "test.sqlite"));
  app = createApp(db);
  expect((await put(body)).body).toEqual(first.body);
  expect(db.prepare("select count(*) n from receipts").get()).toEqual({ n: 1 });
});
it("preserves task weights, reweights completed entries and removes their results", async () => {
  let r = await put(mutation(0));
  expect(r.body.result.scorePercent).toBe(20);
  r = await put({ ...mutation(1), tasks: [{ ...tasks[0], weightLabel: "M" }] });
  expect(r.body.result).toMatchObject({ plannedPoints: 5, completedPoints: 5 });
  r = await put({ ...mutation(2), tasks: [] });
  expect(r.body.result).toMatchObject({ plannedPoints: 0, scorePercent: null });
});
it("enforces local access and body limits without leaking files", async () => {
  expect(
    (
      await api()
        .get("/api/days/" + date)
        .set("Host", "evil.example")
    ).status,
  ).toBe(403);
  expect(
    (
      await api()
        .put("/api/days/" + date)
        .set("Host", "127.0.0.1:3001")
        .set("Content-Type", "text/plain")
        .send("abc")
    ).status,
  ).toBe(400);
  expect(
    (
      await put({
        ...mutation(0),
        tasks: [{ ...tasks[0], title: "a".repeat(1100000) }],
      })
    ).status,
  ).toBe(413);
  const read = await api()
    .get("/api/days/" + date)
    .set("Host", "127.0.0.1:3001");
  expect(read.headers["cache-control"]).toBe("no-store");
  expect(
    (
      await api()
        .get("/data/central-command.sqlite")
        .set("Host", "127.0.0.1:3001")
    ).status,
  ).toBe(404);
});
it("refuses unknown schema versions without changing saved data", async () => {
  await put(mutation(0));
  db.pragma("user_version = 3");
  expect(() => openDatabase(join(dir, "test.sqlite"))).toThrow(
    "Unsupported database version",
  );
  expect(db.prepare("select count(*) n from days").get()).toEqual({ n: 1 });
});
it("failed schema initialization rolls back without resetting existing records", async () => {
  const file = join(dir, "migration.sqlite");
  const Database = (await import("better-sqlite3")).default;
  const raw = new Database(file);
  raw.exec(
    "CREATE TABLE receipts (id TEXT PRIMARY KEY); INSERT INTO receipts VALUES ('preserved');",
  );
  raw.close();
  expect(() => openDatabase(file)).toThrow();
  const after = new Database(file);
  expect(after.pragma("user_version", { simple: true })).toBe(0);
  expect(after.prepare("SELECT id FROM receipts").get()).toEqual({
    id: "preserved",
  });
  expect(
    after.prepare("SELECT name FROM sqlite_master WHERE name='days'").get(),
  ).toBeUndefined();
  after.close();
});
it("preserves saved plans and retry receipts across an actual process restart", async () => {
  const body = mutation(0);
  const first = await put(body);
  db.close();
  const { execFileSync } = await import("node:child_process");
  const script =
    "import {openDatabase} from './src/server/db/database.ts';import {readDay} from './src/server/db/daily-plan-store.ts';const db=openDatabase(process.env.TEST_DB);console.log(JSON.stringify(readDay(db,'2026-10-31')));db.close();";
  const output = execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script],
    {
      env: { ...process.env, TEST_DB: join(dir, "test.sqlite") },
      encoding: "utf8",
    },
  );
  expect(JSON.parse(output)).toEqual(first.body);
  db = openDatabase(join(dir, "test.sqlite"));
  app = createApp(db);
  expect((await put(body)).body).toEqual(first.body);
});
