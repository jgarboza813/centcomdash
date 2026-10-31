import { test, expect, type Page } from "@playwright/test";
import { today } from "../../src/domain/dates";
import { mkdirSync } from "node:fs";
const date = today();
const seedTasks = ["XL", "XL", "XL", "L", "L", "M", "M", "M", "S"].map(
  (weightLabel, i) => ({
    id: crypto.randomUUID(),
    title: [
      "Dev Sync Slides",
      "Gym",
      "AI Summer Series",
      "Review Production PR",
      "Call Travis",
      "Buy Groceries",
      "Read Book",
      "Meditate",
      "Daily Budget",
    ][i],
    weightLabel,
    completed: i < 5,
  }),
);
async function seed(page: Page, day: string, tasks = seedTasks) {
  const get = await page.request.get("/api/days/" + day),
    env = await get.json();
  if (env.plan.status === "finalized")
    await page.request.post(`/api/days/${day}/reopen`, {
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: env.plan.revision,
      },
    });
  const fresh = await (await page.request.get("/api/days/" + day)).json();
  return (
    await page.request.put("/api/days/" + day, {
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: fresh.plan.revision,
        tasks,
      },
    })
  ).json();
}
test("planning, fixed score, finalized calendar, reopen and reload", async ({
  page,
}) => {
  await seed(page, date, []);
  await page.goto("/");
  await expect(page.getByText("Make room for what matters.")).toBeVisible();
  await page.getByRole("button", { name: "＋ Add task" }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Enter a title");
  await page.getByLabel("Task title", { exact: true }).fill("My commitment");
  await page.getByLabel("Weight", { exact: true }).selectOption("XL");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("checkbox", { name: "Complete My commitment" }).check();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await expect(page.locator(".metric").nth(1)).toContainText("20%");
  await expect(
    page.getByRole("button", { name: new RegExp(date + ": No data") }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More day actions" }).click();
  await page.getByRole("button", { name: "Finalize Day", exact: true }).click();
  await expect(page.getByText("● Finalized")).toBeVisible();
  await expect(
    page.getByRole("button", { name: new RegExp(date + ": 20%") }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("● Finalized")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Complete My commitment" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "More day actions" }).click();
  await page.getByRole("button", { name: "Reopen Day", exact: true }).click();
  await expect(page.getByText("○ Editable")).toBeVisible();
  await expect(
    page.getByRole("button", { name: new RegExp(date + ": No data") }),
  ).toBeVisible();
});
test("save failures preserve drafts and lost responses retry exactly once", async ({
  page,
}) => {
  await seed(page, date);
  await page.goto("/");
  await expect(page.locator(".metric").nth(1)).toContainText("80%");
  let fail = true;
  await page.route("**/api/days/" + date, async (route) => {
    if (route.request().method() === "PUT" && fail) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.getByRole("checkbox", { name: "Complete Buy Groceries" }).check();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Complete Buy Groceries" }),
  ).toBeChecked();
  fail = false;
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Complete Buy Groceries" }),
  ).toBeChecked();
});
test("stale tabs conflict rather than overwrite", async ({ page, context }) => {
  await seed(page, date);
  await page.goto("/");
  await expect(
    page.getByRole("checkbox", { name: "Complete Meditate" }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByRole("checkbox", { name: "Complete Meditate" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Complete Meditate" }).check();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await second.getByRole("checkbox", { name: "Complete Read Book" }).check();
  await expect(second.getByRole("alert")).toContainText("Conflict");
  await expect(
    second.getByRole("checkbox", { name: "Complete Read Book" }),
  ).toBeChecked();
  await second.close();
});
test("reference layout and color consistency at desktop and mobile", async ({
  page,
}) => {
  await seed(page, date);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await expect(page.locator(".metric").nth(1)).toContainText("80%");
  await expect(page.locator(".metric").nth(1).locator("strong")).toHaveClass(
    "score-yellow",
  );
  await expect(
    page.getByRole("heading", { name: "Points by Category" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Insights", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sync with Things" }),
  ).toBeEnabled();
  mkdirSync("artifacts/dashboard", { recursive: true });
  await page.screenshot({
    path: "artifacts/dashboard/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.locator("#calendar")).toBeFocused();
  await page.screenshot({
    path: "artifacts/dashboard/mobile.png",
    fullPage: true,
  });
});
test("nine-task planning is quick and handles edit/remove independently", async ({
  page,
}) => {
  await seed(page, date, []);
  await page.goto("/");
  const start = Date.now();
  for (const [i, w] of [
    "XL",
    "XL",
    "XL",
    "L",
    "L",
    "M",
    "M",
    "M",
    "S",
  ].entries()) {
    await page.getByRole("button", { name: "＋ Add task" }).click();
    await page
      .getByLabel("Task title", { exact: true })
      .fill("Planned task " + i);
    await page.getByLabel("Weight", { exact: true }).selectOption(w);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await expect(page.locator(".metric").first()).toContainText("96%");
  expect(Date.now() - start).toBeLessThan(180000);
  await page.getByRole("button", { name: "Edit Plan" }).click();
  await page.getByLabel("Weight for Planned task 0").selectOption("M");
  await expect(page.locator(".metric").first()).toContainText("81%");
  await page.getByRole("button", { name: "Remove Planned task 0" }).click();
  await expect(page.locator(".metric").first()).toContainText("76%");
  await page.getByRole("button", { name: "Done", exact: true }).click();
});
test("load failure does not overwrite data; lost acknowledgement replays once", async ({
  page,
}) => {
  await seed(page, date);
  let failLoad = true;
  await page.route("**/api/days/" + date, async (route) => {
    if (route.request().method() === "GET" && failLoad) await route.abort();
    else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Could not load");
  failLoad = false;
  await page.getByRole("button", { name: "Retry load" }).click();
  await expect(page.locator(".metric").first()).toContainText("96%");
  const before = await (await page.request.get("/api/days/" + date)).json();
  let lost = true;
  await page.route("**/api/days/" + date, async (route) => {
    if (route.request().method() === "PUT" && lost) {
      lost = false;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("checkbox", { name: "Complete Read Book" }).check();
  await expect(page.getByRole("button", { name: "Retry save" })).toBeVisible();
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  const after = await (await page.request.get("/api/days/" + date)).json();
  expect(after.plan.revision).toBe(before.plan.revision + 1);
  expect(after.plan.tasks).toHaveLength(9);
});
test("new edits during a slow save are preserved across date navigation", async ({
  page,
}) => {
  await seed(page, date);
  await page.goto("/");
  await expect(page.locator(".metric").first()).toContainText("96%");
  let first = true;
  await page.route("**/api/days/" + date, async (route) => {
    if (route.request().method() === "PUT" && first) {
      first = false;
      await new Promise((r) => setTimeout(r, 500));
    }
    await route.continue();
  });
  await page.getByRole("checkbox", { name: "Complete Read Book" }).check();
  await page.waitForTimeout(350);
  await page.getByRole("checkbox", { name: "Complete Meditate" }).check();
  await page.getByLabel("View day").fill("2026-10-01");
  await expect(page.getByText("Thursday, October 1, 2026")).toBeVisible();
  await page.getByLabel("View day").fill(date);
  await expect(
    page.getByRole("checkbox", { name: "Complete Read Book" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Complete Meditate" }),
  ).toBeChecked();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Complete Meditate" }),
  ).toBeChecked();
});
test("calendar legend boundaries and finalized-only eligibility", async ({
  page,
}) => {
  const values = [0, 44, 45, 64, 65, 84, 85, 94, 95, 120];
  const month = date.slice(0, 7);
  for (const [i, value] of values.entries()) {
    const d = month + "-" + String(i + 1).padStart(2, "0");
    const tasks = Array.from({ length: value }, (_, n) => ({
      id: crypto.randomUUID(),
      title: "Score " + n,
      weightLabel: "S",
      completed: true,
    }));
    const env = await seed(page, d, tasks);
    await page.request.post(`/api/days/${d}/finalize`, {
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: env.plan.revision,
      },
    });
  }
  await seed(page, date);
  await page.goto("/");
  for (const [i, value] of values.entries()) {
    const d = month + "-" + String(i + 1).padStart(2, "0");
    const cell = page.getByRole("button", {
      name: d + ": " + (value ? value + "%" : "No data"),
      exact: true,
    });
    await expect(cell).toHaveClass(
      new RegExp(
        "score-" +
          (value === 0
            ? "none"
            : value >= 95
              ? "bright"
              : value >= 85
                ? "green"
                : value >= 65
                  ? "yellow"
                  : value >= 45
                    ? "orange"
                    : "red"),
      ),
    );
  }
  await page.getByRole("button", { name: "Previous month" }).click();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(
    page.getByRole("button", { name: month + "-01: No data", exact: true }),
  ).toBeVisible();
});

test("keyboard-only task entry, navigation and lifecycle controls", async ({
  page,
}) => {
  await seed(page, date, []);
  await page.goto("/");
  const add = page.getByRole("button", { name: "＋ Add task" });
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Task title", { exact: true })).toBeFocused();
  await page.keyboard.type("Keyboard task");
  await page.keyboard.press("Tab");
  await page.keyboard.press("s");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("checkbox", { name: "Complete Keyboard task" }),
  ).toBeVisible();
  const check = page.getByRole("checkbox", { name: "Complete Keyboard task" });
  await check.focus();
  await page.keyboard.press("Space");
  await expect(check).toBeChecked();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More day actions" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByText("● Finalized")).toBeVisible();
});
test("one hundred tasks update visibly within one second", async ({ page }) => {
  const tasks = Array.from({ length: 100 }, (_, i) => ({
    id: crypto.randomUUID(),
    title: "Task " + i,
    weightLabel: "S",
    completed: false,
  }));
  await seed(page, date, tasks);
  await page.goto("/");
  await expect(page.locator(".metric").first()).toContainText("100%");
  const start = Date.now();
  await page
    .getByRole("checkbox", { name: "Complete Task 0", exact: true })
    .check();
  await expect(page.locator(".metric").nth(1)).toContainText("1%");
  expect(Date.now() - start).toBeLessThan(1000);
});
test("failed finalization stays editable and exact retry succeeds", async ({
  page,
}) => {
  await seed(page, date);
  await page.goto("/");
  await expect(page.getByText("○ Editable")).toBeVisible();
  let fail = true;
  await page.route("**/api/days/" + date + "/finalize", async (route) => {
    if (fail) await route.abort();
    else await route.continue();
  });
  await page.getByRole("button", { name: "More day actions" }).click();
  await page.getByRole("button", { name: "Finalize Day", exact: true }).click();
  await expect(page.getByText("○ Editable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry save" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByText("● Finalized")).toBeVisible();
});
