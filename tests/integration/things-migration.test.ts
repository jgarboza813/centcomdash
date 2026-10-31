import { it, expect } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "../../src/server/db/database";
import { initialize } from "../../src/server/db/migrations/001-initial";
import { emptyPlan } from "../../src/domain/daily-plan";
it("migrates v1 without rewriting finalized plans or old receipts", () => {
  const dir = mkdtempSync(join(tmpdir(), "centcom-v1-"));
  try {
    const file = join(dir, "v1.sqlite"),
      old = new Database(file);
    initialize(old);
    const record = JSON.stringify({
      ...emptyPlan("2026-10-30"),
      status: "finalized",
    });
    old.prepare("INSERT INTO days VALUES (?,?)").run("2026-10-30", record);
    old
      .prepare("INSERT INTO receipts VALUES (?,?,?)")
      .run("old", "fingerprint", '{"legacy":true}');
    old.close();
    const next = openDatabase(file);
    expect(next.pragma("user_version", { simple: true })).toBe(2);
    expect(next.prepare("SELECT record FROM days").get()).toEqual({ record });
    expect(next.prepare("SELECT response FROM receipts").get()).toEqual({
      response: '{"legacy":true}',
    });
    next.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("rolls back an incompatible v1 upgrade instead of resetting history", () => {
  const dir = mkdtempSync(join(tmpdir(), "centcom-v1-fail-"));
  try {
    const file = join(dir, "v1.sqlite"),
      old = new Database(file);
    initialize(old);
    old.exec("CREATE TABLE things_sync_state(date TEXT);");
    old.close();
    expect(() => openDatabase(file)).toThrow();
    const check = new Database(file);
    expect(check.pragma("user_version", { simple: true })).toBe(1);
    expect(
      check
        .prepare("SELECT name FROM sqlite_master WHERE name='things_links'")
        .get(),
    ).toBeUndefined();
    check.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
