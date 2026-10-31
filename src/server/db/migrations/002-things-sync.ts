import type Database from "better-sqlite3";
export function addThingsSync(db: Database.Database) {
  db.transaction(() => {
    db.exec(
      `CREATE TABLE things_links(date TEXT NOT NULL REFERENCES days(date),task_id TEXT NOT NULL,source_id TEXT NOT NULL,PRIMARY KEY(date,task_id),UNIQUE(date,source_id));CREATE TABLE things_sync_state(date TEXT PRIMARY KEY REFERENCES days(date),record TEXT NOT NULL);PRAGMA user_version=2;`,
    );
  })();
}
