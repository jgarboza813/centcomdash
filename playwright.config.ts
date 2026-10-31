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
      command: "npx tsx tests/fixtures/things/mock-server.ts",
      url: "http://127.0.0.1:5236/metrics",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      env: {
        PORT: "5237",
        CENTCOM_BACKEND_URL: "http://127.0.0.1:5237",
        CENTCOM_DB_PATH: join(dir, "test.sqlite"),
        CENTCOM_THINGS_API_URL: "http://127.0.0.1:5236",
        CENTCOM_THINGS_API_TOKEN: "e2e-fixture-token",
      },
    },
  ],
});
