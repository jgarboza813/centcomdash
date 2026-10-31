import { mkdirSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { today } from "../../src/domain/dates";
const date = today(),
  source = "http://127.0.0.1:5236";
async function reset(page: Page) {
  await page.request.post(source + "/control", { data: {} });
  let e = await (await page.request.get("/api/days/" + date)).json();
  if (e.plan.status === "finalized") {
    await page.request.post(`/api/days/${date}/reopen`, {
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: e.plan.revision,
      },
    });
    e = await (await page.request.get("/api/days/" + date)).json();
  }
  await page.request.put("/api/days/" + date, {
    data: {
      requestId: crypto.randomUUID(),
      expectedRevision: e.plan.revision,
      tasks: [],
    },
  });
}
test("only button clicks import Today and This Evening; tags/weights and Things authority work", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sync with Things" }),
  ).toBeEnabled();
  await page.reload();
  await page.getByLabel("View day").fill("2026-10-01");
  await page.getByLabel("View day").fill(date);
  await expect(
    page.getByRole("button", { name: "Sync with Things" }),
  ).toBeEnabled();
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(0);
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await expect(
    page.getByRole("region", { name: "Things sync result" }),
  ).toContainText("2 added");
  await expect(
    page.getByRole("checkbox", { name: "Complete Imported Things XL" }),
  ).toBeVisible();
  await expect(page.locator(".metric").first()).toContainText("21%");
  await page.request.post(source + "/control", { data: { completed: true } });
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await expect(page.locator(".metric").nth(1)).toContainText("20%");
  await expect(
    page.getByRole("checkbox", { name: "Complete Imported Things XL" }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Complete Imported Things XL" })
    .uncheck();
  await expect(page.locator(".save-state")).toHaveText("Saved");
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Complete Imported Things XL" }),
  ).toBeChecked();
  await expect(page.locator(".task-row")).toHaveCount(2);
});
test("source failures do not retry automatically or erase data", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await expect(
    page.getByRole("region", { name: "Things sync result" }),
  ).toContainText("2 added");
  await page.request.post(source + "/control", { data: { failure: true } });
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  const count = (await (await page.request.get(source + "/metrics")).json())
    .reads;
  await page.waitForTimeout(400);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(count);
  await expect(page.locator(".task-row")).toHaveCount(2);
});
test("lost response recovers through same button without another Things read", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/");
  let lost = true;
  await page.route("**/api/days/" + date + "/things-sync", async (route) => {
    if (lost) {
      lost = false;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await expect(
    page.getByRole("button", { name: "Sync with Things — recover result" }),
  ).toBeVisible();
  const count = (await (await page.request.get(source + "/metrics")).json())
    .reads;
  await page
    .getByRole("button", { name: "Sync with Things — recover result" })
    .click();
  await expect(
    page.getByRole("region", { name: "Things sync result" }),
  ).toContainText("2 added");
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(count);
  await expect(page.locator(".task-row")).toHaveCount(2);
});
test("keyboard and mobile have visible explicit sync action", async ({
  page,
}) => {
  await reset(page);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Sync with Things" });
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Things sync result" }),
  ).toContainText("2 added");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  mkdirSync("artifacts/things-sync", { recursive: true });
  await page.screenshot({
    path: "artifacts/things-sync/mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "artifacts/things-sync/desktop.png",
    fullPage: true,
  });
});
test("failed autosave blocks source reads", async ({ page }) => {
  await reset(page);
  await page.goto("/");
  await page.route("**/api/days/" + date, async (route) => {
    if (route.request().method() === "PUT") await route.abort();
    else await route.continue();
  });
  await page.getByRole("button", { name: "＋ Add task" }).click();
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Unsaved commitment");
  await page.getByLabel("Weight", { exact: true }).selectOption("S");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await expect(
    page.getByRole("button", { name: "Sync with Things" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("checkbox", { name: "Complete Unsaved commitment" }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(0);
});
test("navigation during sync keeps response on the captured date", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/");
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const begin = new Promise<void>((r) => {
    started = r;
  });
  await page.route("**/api/days/" + date + "/things-sync", async (route) => {
    started();
    await gate;
    await route.continue();
  });
  await page.getByRole("button", { name: "Sync with Things" }).click();
  await begin;
  await page.getByLabel("View day").fill("2026-10-01");
  await expect(
    page.getByRole("button", { name: "Sync with Things" }),
  ).toBeDisabled();
  release();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/days/" + date)).json()).plan.tasks
          .length,
    )
    .toBe(2);
  await expect(
    page.getByRole("checkbox", { name: "Complete Imported Things XL" }),
  ).toHaveCount(0);
  await page.getByLabel("View day").fill(date);
  await expect(
    page.getByRole("region", { name: "Things sync result" }),
  ).toContainText("2 added");
});
