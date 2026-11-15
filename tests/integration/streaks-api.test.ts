import { afterEach, beforeEach, expect, it, vi } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../src/server/app";
import { openDatabase } from "../../src/server/db/database";
import { emptyPlan } from "../../src/domain/daily-plan";
let dir: string,
  db: ReturnType<typeof openDatabase>,
  app: ReturnType<typeof createApp>;
const readSnapshot = vi.fn(async () => {
  throw new Error("Streaks must not read Things");
});
const clock = vi.fn(() => new Date("2026-11-14T05:00:00Z"));
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "centcom-streaks-"));
  db = openDatabase(join(dir, "test.sqlite"));
  readSnapshot.mockClear();
  clock.mockClear();
  app = createApp(db, { clock, reader: { readSnapshot } });
});
afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
const get = (path = "/api/streaks") =>
  request(app).get(path).set("Host", "127.0.0.1:3001");
function seed(date: string, score = 85, status = "finalized") {
  const p = {
    ...emptyPlan(date),
    status,
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "Fixture",
        weightLabel: "XL",
        weightPoints: score,
        completed: true,
        category: { sourceId: "p1", name: "Saved category" },
      },
    ],
  };
  db.prepare("INSERT OR REPLACE INTO days(date,record) VALUES (?,?)").run(
    date,
    JSON.stringify(p),
  );
}
const snapshot = () =>
  Object.fromEntries(
    ["days", "receipts", "things_links", "things_sync_state"].map((t) => [
      t,
      db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all(),
    ]),
  );
it("returns global saved history, captures clock once, and never writes or reads Things", async () => {
  expect((await get()).body).toEqual({
    asOfDate: "2026-11-14",
    current: 0,
    best: 0,
  });
  for (const d of [
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
  ])
    seed(d);
  const before = snapshot();
  clock.mockClear();
  const r = await get();
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ asOfDate: "2026-11-14", current: 2, best: 4 });
  expect(r.headers["cache-control"]).toBe("no-store");
  expect(clock).toHaveBeenCalledTimes(1);
  expect(readSnapshot).not.toHaveBeenCalled();
  expect(snapshot()).toEqual(before);
  expect((await get("/api/streaks?date=2000-01-01")).status).toBe(400);
  expect(
    (await request(app).get("/api/streaks").set("Host", "evil.test")).status,
  ).toBe(403);
  expect((await get().set("Origin", "https://evil.test")).status).toBe(403);
});
it("uses New York date before midnight and ignores even malformed future records", async () => {
  clock.mockReturnValueOnce(new Date("2026-11-14T04:59:59Z"));
  seed("2026-11-13");
  db.prepare("INSERT INTO days VALUES (?,?)").run("2026-11-15", "bad JSON");
  expect((await get()).body).toEqual({
    asOfDate: "2026-11-13",
    current: 1,
    best: 1,
  });
});
it.each([
  "json",
  "schema",
  "rule",
  "date",
  "status",
  "tasks",
  "completion",
  "points",
  "overflow",
])("fails closed on malformed selected history: %s", async (kind) => {
  seed("2026-11-13");
  const p = JSON.parse(
    (db.prepare("SELECT record FROM days").get() as { record: string }).record,
  );
  if (kind === "schema") p.schemaVersion = 2;
  if (kind === "rule") p.scoreRule = "other";
  if (kind === "date") p.date = "2026-11-12";
  if (kind === "status") p.status = "unknown";
  if (kind === "tasks") p.tasks = null;
  if (kind === "completion") p.tasks[0].completed = "yes";
  if (kind === "points") p.tasks[0].weightPoints = -5;
  if (kind === "overflow")
    p.tasks = [
      { ...p.tasks[0], weightPoints: 1e308 },
      { ...p.tasks[0], weightPoints: 1e308 },
    ];
  db.prepare("UPDATE days SET record=?").run(
    kind === "json" ? "{" : JSON.stringify(p),
  );
  const before = snapshot();
  const r = await get();
  expect(r.status).toBe(500);
  expect(r.body.error.code).toBe("STORAGE_ERROR");
  expect(snapshot()).toEqual(before);
});
it("recalculates reopen/correction/replay, preserves unrelated history and rejects failed changes", async () => {
  seed("2026-11-12");
  seed("2026-11-13");
  seed("2026-11-14", 84);
  const unrelated = db
    .prepare("SELECT record FROM days WHERE date='2026-11-12'")
    .get();
  expect((await get()).body).toMatchObject({ current: 0, best: 2 });
  const body = { requestId: crypto.randomUUID(), expectedRevision: 0 };
  const post = (action: string, b: object) =>
    request(app)
      .post(`/api/days/2026-11-14/${action}`)
      .set("Host", "127.0.0.1:3001")
      .send(b);
  expect((await post("reopen", body)).status).toBe(200);
  expect((await get()).body).toMatchObject({ current: 2, best: 2 });
  expect((await post("reopen", body)).status).toBe(200);
  expect((await get()).body).toMatchObject({ current: 2, best: 2 });
  expect(
    (await post("finalize", { ...body, requestId: crypto.randomUUID() }))
      .status,
  ).toBe(409);
  expect((await get()).body).toMatchObject({ current: 2, best: 2 });
  seed("2026-11-14", 120, "editable");
  const final = { requestId: crypto.randomUUID(), expectedRevision: 0 };
  expect((await post("finalize", final)).status).toBe(200);
  expect((await get()).body).toMatchObject({ current: 3, best: 3 });
  expect((await post("finalize", final)).status).toBe(200);
  expect((await get()).body).toMatchObject({ current: 3, best: 3 });
  expect(
    db.prepare("SELECT record FROM days WHERE date='2026-11-12'").get(),
  ).toEqual(unrelated);
  seed("2026-11-13", 85, "editable");
  expect((await get()).body).toMatchObject({ current: 1, best: 1 });
});

it("returns a structured failure when saved storage cannot be read", async () => {
  db.exec("DROP TABLE days");
  const r = await get();
  expect(r.status).toBe(500);
  expect(r.body.error.code).toBe("STORAGE_ERROR");
  expect(readSnapshot).not.toHaveBeenCalled();
});
