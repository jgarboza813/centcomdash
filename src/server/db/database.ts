import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { initialize } from "./migrations/001-initial";
import { addThingsSync } from "./migrations/002-things-sync";
export function openDatabase(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  try {
    db.pragma("synchronous = FULL");
    const version = db.pragma("user_version", { simple: true }) as number;
    db.pragma("foreign_keys = ON");
    if (version > 2) throw new Error("Unsupported database version");
    if (version === 0) initialize(db);
    if (version < 2) addThingsSync(db);
    return db;
  } catch (err) {
    db.close();
    throw err;
  }
}
export type DB = ReturnType<typeof openDatabase>;
