import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "centcom-e2e-"));
process.env.CENTCOM_TEST_DIR = dir;
export default defineConfig({
  testDir: "tests/e2e",
  globalTeardown: "./tests/fixtures/teardown.ts",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      env: { CENTCOM_DB_PATH: join(dir, "test.sqlite") },
    },
  ],
});
