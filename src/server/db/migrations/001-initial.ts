import type Database from "better-sqlite3";
export function initialize(db: Database.Database) {
  db.transaction(() => {
    db.exec(
      "CREATE TABLE days (date TEXT PRIMARY KEY, record TEXT NOT NULL); CREATE TABLE receipts (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, response TEXT NOT NULL); PRAGMA user_version=1;",
    );
  })();
}
