import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
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
test("project categories appear below titles and remain readable when edited and wrapped", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Things Sync" }).click();
  const xl = page.locator(".task-row").filter({
    has: page.getByRole("checkbox", {
      name: "Complete Imported Things XL",
      exact: true,
    }),
  });
  await expect(xl.locator(".task-category")).toHaveText("Work");
  mkdirSync("artifacts/task-categories", { recursive: true });
  await page
    .locator(".plan-panel")
    .screenshot({ path: "artifacts/task-categories/category-preview.png" });
  await expect(
    page.locator(".task-category").filter({ hasText: "Uncategorized" }),
  ).toHaveCount(1);
  await expect(page.locator(".things-link")).toHaveCount(0);
  await expect(xl.getByRole("checkbox")).toHaveAccessibleDescription(
    "Things controls completion on sync",
  );
  await page.getByRole("button", { name: "Edit Plan", exact: true }).click();
  await expect(xl.locator(".task-category")).toHaveText("Work");
  await xl.getByRole("textbox").fill("Renamed commitment");
  await xl.getByRole("textbox").press("Tab");
  await expect(page.locator(".save-state")).toHaveText("Saved");
  await page.reload();
  await expect(
    page
      .locator(".task-row")
      .filter({ hasText: "Renamed commitment" })
      .locator(".task-category"),
  ).toHaveText("Work");
  const name = "Travel 🌍 <script> & " + "LongProjectName".repeat(6);
  await page.request.post(source + "/control", { data: { projectName: name } });
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(
    page.locator(".task-category").filter({ hasText: name }),
  ).toHaveCount(1);
  mkdirSync("artifacts/task-categories", { recursive: true });
  for (const width of [375, 800, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".task-category")
        .first()
        .evaluate((el) => {
          const a = el.getBoundingClientRect(),
            b = el.closest(".task-title")!.getBoundingClientRect();
          return a.right <= b.right && a.left >= b.left;
        }),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/task-categories/${width}.png`,
      fullPage: true,
    });
  }
});
test("category refresh is explicit and failures preserve the last saved category", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(page.locator(".task-category").first()).toHaveText("Work");
  await page.request.post(source + "/control", {
    data: { projectId: "new-project", projectName: "Travel" },
  });
  await page.reload();
  await expect(page.locator(".task-category").first()).toHaveText("Work");
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(0);
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(page.locator(".task-category").first()).toHaveText("Travel");
  await page.request.post(source + "/control", { data: { failure: true } });
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.locator(".task-category").first()).toHaveText("Travel");
  await page.request.post(source + "/control", {
    data: { uncategorized: true },
  });
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(
    page.locator(".task-category").filter({ hasText: "Uncategorized" }),
  ).toHaveCount(2);
});
test("finalized snapshots and legacy tasks retain their saved context without source reads", async ({
  page,
}) => {
  await reset(page);
  const e = await (await page.request.get("/api/days/" + date)).json();
  await page.request.put("/api/days/" + date, {
    data: {
      requestId: crypto.randomUUID(),
      expectedRevision: e.plan.revision,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: "Manual commitment",
          weightLabel: "S",
          completed: false,
        },
      ],
    },
  });
  await page.request.post(source + "/control", { data: { completed: true } });
  await page.goto("/");
  await expect(page.locator(".task-category")).toHaveText("Uncategorized");
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(
    page.locator(".task-category").filter({ hasText: "Work" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Finalize Day", exact: true }).click();
  await expect(page.getByText("● Finalized")).toBeVisible();
  await page.request.post(source + "/control", {
    data: { projectName: "New name" },
  });
  await page.reload();
  await expect(
    page.locator(".task-category").filter({ hasText: "Work" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: new RegExp(date + ": 20%") }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(0);
});
test("recovering an older receipt cannot replace newer category context", async ({
  page,
}) => {
  await reset(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(page.locator(".task-category").first()).toHaveText("Work");
  await page.request.post(source + "/control", {
    data: { projectName: "Older category" },
  });
  await page.route("**/api/days/" + date + "/things-sync", async (route) => {
    await route.fetch();
    await route.abort();
  });
  await page.getByRole("button", { name: "Things Sync" }).click();
  await expect(
    page.getByRole("button", { name: "Things Sync — recover result" }),
  ).toBeVisible();
  const afterLost = await (await page.request.get("/api/days/" + date)).json();
  await page.request.post(source + "/control", {
    data: { projectName: "Newer category" },
  });
  const newer = await page.request.post(`/api/days/${date}/things-sync`, {
    data: {
      requestId: crypto.randomUUID(),
      expectedRevision: afterLost.plan.revision,
    },
  });
  expect(newer.status()).toBe(200);
  await page
    .getByRole("checkbox", { name: "Complete Imported Things XL" })
    .check();
  await expect(
    page.getByRole("button", { name: "Reload saved day" }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reload saved day" }).click();
  await expect(page.locator(".task-category").first()).toHaveText(
    "Newer category",
  );
  const count = (await (await page.request.get(source + "/metrics")).json())
    .reads;
  await page
    .getByRole("button", { name: "Things Sync — recover result" })
    .click();
  await expect(
    page.getByRole("button", { name: "Things Sync — recover result" }),
  ).toHaveCount(0);
  await expect(page.locator(".task-category").first()).toHaveText(
    "Newer category",
  );
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(count);
});
