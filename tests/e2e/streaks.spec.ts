import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { today, shiftDate } from "../../src/domain/dates";
const date = today();
const card = (page: Page) =>
  page.getByRole("region", { name: "Current streak", exact: true });
async function seed(
  page: Page,
  day: string,
  finalized: boolean,
  qualifies = true,
) {
  let p = (await (await page.request.get(`/api/days/${day}`)).json()).plan;
  if (p.status === "finalized")
    p = (
      await (
        await page.request.post(`/api/days/${day}/reopen`, {
          data: {
            requestId: crypto.randomUUID(),
            expectedRevision: p.revision,
          },
        })
      ).json()
    ).plan;
  p = (
    await (
      await page.request.put(`/api/days/${day}`, {
        data: {
          requestId: crypto.randomUUID(),
          expectedRevision: p.revision,
          tasks: Array.from({ length: 5 }, (_, i) => ({
            id: crypto.randomUUID(),
            title: `Streak fixture ${i}`,
            weightLabel: "XL",
            completed: qualifies,
          })),
        },
      })
    ).json()
  ).plan;
  if (finalized)
    await page.request.post(`/api/days/${day}/finalize`, {
      data: { requestId: crypto.randomUUID(), expectedRevision: p.revision },
    });
}
async function resume(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
test("saved finalize/reopen, global historical browsing and reload correction update both displays", async ({
  page,
}) => {
  await seed(page, shiftDate(date, -2), false);
  await seed(page, shiftDate(date, -1), true);
  await seed(page, date, false);
  await page.goto("/");
  await expect(page.getByTestId("streak-count")).toHaveText("1day");
  await page.route("**/api/days/*", (r) =>
    r.request().method() === "PUT"
      ? r.fulfill({
          status: 500,
          json: {
            error: { code: "STORAGE_ERROR", message: "Fixture save failure" },
          },
        })
      : r.continue(),
  );
  await page
    .getByRole("checkbox", { name: "Complete Streak fixture 0", exact: true })
    .uncheck();
  await expect(page.getByText("Fixture save failure")).toBeVisible();
  await expect(page.getByTestId("streak-count")).toHaveText("1day");
  await page.unroute("**/api/days/*");
  await page
    .getByRole("checkbox", { name: "Complete Streak fixture 0", exact: true })
    .check();
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.locator(".save-state")).toHaveText("Saved");
  await expect(page.getByTestId("streak-count")).toHaveText("1day");
  await page.getByRole("button", { name: "Finalize Day", exact: true }).click();
  await expect(page.getByTestId("streak-count")).toHaveText("2days", {
    timeout: 1000,
  });
  await expect(page.getByTestId("sidebar-streak-count")).toHaveText("2");
  await page.getByRole("button", { name: "Reopen Day", exact: true }).click();
  await expect(page.getByTestId("streak-count")).toHaveText("1day");
  await page.getByLabel("View day").fill(shiftDate(date, -1));
  await expect(
    page.getByRole("button", { name: "Reopen Day", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("streak-count")).toHaveText("1day");
  // A failed finalize must leave saved-state counts unchanged.
  await page.getByLabel("View day").fill(date);
  await page.route("**/api/days/*/finalize", (r) =>
    r.fulfill({
      status: 500,
      json: { error: { code: "STORAGE_ERROR", message: "Fixture failure" } },
    }),
  );
  await page.getByRole("button", { name: "Finalize Day", exact: true }).click();
  await expect(page.getByText("Fixture failure")).toBeVisible();
  await expect(page.getByTestId("streak-count")).toHaveText("1day");
  await page.unroute("**/api/days/*/finalize");
  // An external correction makes the local revision stale; conflict reload is an acknowledgment too.
  await seed(page, date, true);
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reload saved day", exact: true })
    .click();
  await expect(page.getByTestId("streak-count")).toHaveText("2days");
  await expect(page.getByTestId("sidebar-streak-count")).toHaveText("2");
});
test("initial failure/malformed summary, stale refresh, keyboard retry and timeout are distinct from zero", async ({
  page,
}) => {
  let mode = "loading",
    reads = 0;
  const initialReads: (() => void)[] = [];
  await page.route("**/api/streaks", async (r) => {
    reads++;
    if (mode === "loading")
      await new Promise<void>((resolve) => initialReads.push(resolve));
    if (mode === "hang") return;
    await r.fulfill(
      mode === "failure"
        ? { status: 500, json: { error: { message: "Fixture read failure" } } }
        : {
            json:
              mode === "malformed"
                ? { asOfDate: date, current: 3, best: 1 }
                : { asOfDate: date, current: 0, best: 2 },
          },
    );
  });
  await page.goto("/");
  await expect(page.locator(".streak-detail")).toHaveText("Loading streak");
  await expect(page.getByTestId("streak-count")).toHaveText("—");
  mode = "failure";
  initialReads.forEach((resolve) => resolve());
  await expect(page.locator(".streak-detail")).toContainText("Unavailable");
  await expect(page.getByTestId("streak-count")).toHaveText("—");
  mode = "malformed";
  await page
    .getByRole("button", { name: "Retry streaks", exact: true })
    .click();
  await expect(page.locator(".streak-detail")).toContainText("Unavailable");
  mode = "ok";
  const retry = page.getByRole("button", {
    name: "Retry streaks",
    exact: true,
  });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("streak-count")).toHaveText("0days");
  mode = "failure";
  await resume(page);
  await expect(card(page)).toContainText("Stale");
  await expect(page.getByTestId("streak-count")).toHaveText("0days");
  await page.getByLabel("Streak details", { exact: true }).click();
  await expect(page.locator(".metric-streak .streak-popover")).toContainText(
    `As of ${date}`,
  );
  await page.getByLabel("Streak details", { exact: true }).click();
  await page.clock.install();
  mode = "hang";
  await page
    .getByRole("button", { name: "Retry streaks", exact: true })
    .click();
  await expect(card(page)).toContainText("Updating");
  await page.clock.runFor(15_100);
  await expect(card(page)).toContainText("Stale");
  await page.getByLabel("Streak details", { exact: true }).click();
  await expect(page.locator(".metric-streak .streak-popover")).toContainText(
    "timed out",
  );
  const before = reads;
  await page.clock.runFor(120_000);
  expect(reads).toBe(before);
  await page.getByLabel("Streak details", { exact: true }).click();
  mode = "ok";
  await page
    .getByRole("button", { name: "Retry streaks", exact: true })
    .click();
  await expect(card(page)).not.toContainText("Stale");
});
test("midnight checks only read on date change; paired resume refreshes immediately without writes/source calls", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-15T04:59:50Z") });
  let reads = 0;
  const writes: string[] = [];
  await page.route("**/api/streaks", async (r) => {
    reads++;
    await r.fulfill({
      json: {
        asOfDate: reads < 3 ? "2026-11-14" : "2026-11-15",
        current: reads < 3 ? 2 : 0,
        best: 7,
      },
    });
  });
  await page.request.post("http://127.0.0.1:5236/control", { data: {} });
  page.on("request", (r) => {
    if (r.url().includes("/api/") && r.method() !== "GET") writes.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByTestId("streak-count")).toHaveText("2days");
  await page.waitForTimeout(100);
  const initial = reads;
  const selected = await page.getByLabel("View day").inputValue();
  await page.clock.runFor(30_100);
  await expect.poll(() => reads).toBe(initial + 1);
  const after = reads;
  await page.clock.runFor(90_000);
  expect(reads).toBe(after);
  await resume(page);
  await expect.poll(() => reads).toBe(after + 1);
  await expect(page.getByLabel("View day")).toHaveValue(selected);
  expect(writes).toEqual([]);
  expect(
    (await (await page.request.get("http://127.0.0.1:5236/metrics")).json())
      .reads,
  ).toBe(0);
});
test("new acknowledgments and new-date reads supersede delayed responses", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-15T04:59:35Z") });
  let reads = 0;
  let release: () => void = () => {};
  await page.route("**/api/streaks", async (r) => {
    reads++;
    const n = reads;
    if (n === 1)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await r
      .fulfill({
        json: { asOfDate: date, current: n === 1 ? 999 : 3, best: 999 },
      })
      .catch(() => {});
  });
  await page.goto("/");
  await expect(page.getByTestId("streak-count")).toHaveText("3days");
  release();
  await expect(page.getByTestId("streak-count")).toHaveText("3days");
  let releaseOld: () => void = () => {};
  let newer = false;
  await page.unroute("**/api/streaks");
  await page.route("**/api/streaks", async (r) => {
    if (!newer) {
      await new Promise<void>((resolve) => {
        releaseOld = resolve;
      });
      await r
        .fulfill({ json: { asOfDate: "2026-11-14", current: 88, best: 88 } })
        .catch(() => {});
    } else
      await r.fulfill({
        json: { asOfDate: "2026-11-15", current: 0, best: 7 },
      });
  });
  await page.clock.runFor(20_000);
  await resume(page);
  await expect(card(page)).toContainText("Updating");
  newer = true;
  await page.clock.runFor(10_100);
  await expect(page.getByTestId("streak-count")).toHaveText("0days");
  releaseOld();
  await expect(page.getByTestId("streak-count")).toHaveText("0days");
});
for (const width of [375, 800, 1440])
  test(`responsive counts/help and rail at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let count = 0;
    await page.route("**/api/streaks", (r) =>
      r.fulfill({
        json: { asOfDate: date, current: count, best: Math.max(count, 7) },
      }),
    );
    await page.goto("/");
    await expect(page.getByTestId("streak-count")).toHaveText("0days");
    mkdirSync("artifacts/streaks", { recursive: true });
    for (const n of [1, 999, 1000]) {
      count = n;
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.getByTestId("streak-count")).toHaveText(
        `${n}${n === 1 ? "day" : "days"}`,
      );
      // Let successive genuine resume events lie outside the paired-event debounce.
      await page.waitForTimeout(260);
      const fit = await card(page).evaluate(
        (el) => el.scrollWidth <= el.clientWidth,
      );
      expect(fit).toBe(true);
    }
    const help = page.getByLabel("Streak details", { exact: true });
    await help.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".metric-streak .streak-popover")).toContainText(
      "at least 85%",
    );
    await page.screenshot({ path: `artifacts/streaks/${width}-help.png` });
    await page.keyboard.press("Enter");
    if (width === 375)
      await page.getByRole("button", { name: "Toggle navigation" }).click();
    await expect(page.getByTestId("sidebar-streak-count")).toBeVisible();
    await expect(page.getByTestId("sidebar-streak-count")).toHaveText("1000");
    const rail = page.locator(".sidebar-streak");
    expect(await rail.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.getByLabel("Sidebar streak details", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".sidebar-streak .streak-popover")).toContainText(
      "Best: 1000 days",
    );
    await page.screenshot({ path: `artifacts/streaks/${width}-sidebar.png` });
    await page.keyboard.press("Enter");
    await page.unroute("**/api/streaks");
    let failure = true;
    await page.route("**/api/streaks", (r) =>
      r.fulfill(
        failure
          ? { status: 500, json: { error: { message: "Fixture offline" } } }
          : { json: { asOfDate: date, current: 1000, best: 1000 } },
      ),
    );
    await page.waitForTimeout(260);
    await resume(page);
    await expect(rail).toContainText("Stale");
    expect(await rail.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `artifacts/streaks/${width}-stale-sidebar.png`,
    });
    if (width === 375)
      await page
        .locator(".sidebar")
        .getByRole("button", { name: "Today", exact: true })
        .click();
    await expect(card(page)).toContainText("Stale");
    expect(
      await card(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: `artifacts/streaks/${width}-stale.png` });
    failure = false;
    await page
      .getByRole("button", { name: "Retry streaks", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(card(page)).not.toContainText("Stale");
    failure = true;
    await page.reload();
    await expect(page.locator(".streak-detail")).toContainText("Unavailable");
    expect(
      await card(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/streaks/${width}-unavailable.png`,
    });

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("suspended resume and unmount cancel listeners, timers and pending reads", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-15T04:59:50Z") });
  let reads = 0;
  const failed: string[] = [];
  await page.route("**/api/streaks", async (r) => {
    reads++;
    if (reads === 3) return;
    await r.fulfill({
      json: {
        asOfDate: reads === 1 ? "2026-11-14" : "2026-11-15",
        current: reads === 1 ? 2 : 0,
        best: 7,
      },
    });
  });
  await page.route("**/streak-hook-harness", (r) =>
    r.fulfill({ contentType: "text/html", body: '<div id="probe"></div>' }),
  );
  await page.goto("/streak-hook-harness");
  await page.evaluate(async () => {
    const runtimePath = "/@react-refresh";
    const runtime = (await import(/* @vite-ignore */ runtimePath)).default;
    runtime.injectIntoGlobalHook(window);
    (window as any).$RefreshReg$ = () => {};
    (window as any).$RefreshSig$ = () => (type: unknown) => type;
    (window as any).__vite_plugin_react_preamble_installed__ = true;
    const path = "/tests/fixtures/streak-hook.tsx";
    const fixture = await import(/* @vite-ignore */ path);
    (window as any).probe = fixture.mountStreakProbe(
      document.getElementById("probe")!,
    );
  });
  await expect(page.locator("output")).toContainText('"current":2');
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    }),
  );
  await page.clock.runFor(90_000);
  expect(reads).toBe(1);
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    }),
  );
  await resume(page);
  await expect(page.locator("output")).toContainText('"current":0');
  expect(reads).toBe(2);
  page.on("requestfailed", (r) => {
    if (r.url().endsWith("/api/streaks"))
      failed.push(r.failure()?.errorText ?? "");
  });
  await page.evaluate(() => (window as any).probe.acknowledge(1));
  await expect.poll(() => reads).toBe(3);
  await page.evaluate(() => (window as any).probe.unmount());
  await expect.poll(() => failed.length).toBe(1);
  await page.clock.runFor(86_400_000);
  await resume(page);
  expect(reads).toBe(3);
});
