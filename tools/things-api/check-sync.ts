// Explicit opt-in live read; writes only an owned temporary Central Command database.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/server/db/database";
import { createSyncService } from "../../src/server/things/sync-service";
import { httpThingsReader } from "../../src/server/things/http-things-reader";
import { today } from "../../src/domain/dates";
const dir = mkdtempSync(join(tmpdir(), "centcom-live-sync-"));
const db = openDatabase(join(dir, "db.sqlite"));
try {
  const service = createSyncService(db, httpThingsReader());
  let revision = 0;
  let first: any;
  for (let i = 0; i < 10; i++) {
    const r = await service.sync(today(), {
      requestId: crypto.randomUUID(),
      expectedRevision: revision,
    });
    if (!first) first = r;
    revision = r.day.plan.revision;
    if (i && r.sync.addedCount) throw new Error("Unexpected duplicate import");
  }
  const recovered = service.recover(today(), {
    requestId: first.sync.requestId,
    expectedRevision: 0,
  });
  if (recovered.day.plan.tasks.length !== first.day.plan.tasks.length)
    throw new Error("Receipt mismatch");
  console.log(
    JSON.stringify({
      liveReadOnly: true,
      imported: first.sync.addedCount,
      unresolved: first.sync.unresolvedCount,
      repeatedSyncs: 10,
      duplicateEntries: 0,
      receiptRecovery: "pass",
      userDashboardModified: false,
    }),
  );
} finally {
  db.close();
  rmSync(dir, { recursive: true, force: true });
}
