import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { initialize } from "./migrations/001-initial";
export function openDatabase(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  try {
    db.pragma("synchronous = FULL");
    const version = db.pragma("user_version", { simple: true }) as number;
    if (version > 1) throw new Error("Unsupported database version");
    if (version === 0) initialize(db);
    return db;
  } catch (err) {
    db.close();
    throw err;
  }
}
export type DB = ReturnType<typeof openDatabase>;
