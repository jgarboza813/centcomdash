import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export default function teardown() {
  const dir = process.env.CENTCOM_TEST_DIR;
  if (dir?.startsWith(join(tmpdir(), "centcom-e2e-")))
    rmSync(dir, { recursive: true, force: true });
}
