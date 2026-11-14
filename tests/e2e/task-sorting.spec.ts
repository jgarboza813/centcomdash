import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { today } from "../../src/domain/dates";
const date = today(),
  source = "http://127.0.0.1:5236";
const titles = [
  "Task 10",
  "Echo",
  "echo",
  "Task 2",
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Alpha",
  "Écho",
  "Zulu",
  "Task 1",
];
const labels = ["S", "XL", "M", "L", "XL", "S", "L", "M", "S", "M", "XL", "L"];
const fixture = () =>
  titles.map((title, i) => ({
    id: crypto.randomUUID(),
    title,
    weightLabel: labels[i],
    completed: [0, 2, 6, 8, 10].includes(i),
  }));
async function seed(page: Page, day = date, tasks = fixture()) {
  let e = await (await page.request.get("/api/days/" + day)).json();
  if (e.plan.status === "finalized") {
    await page.request.post(`/api/days/${day}/reopen`, {
      data: {
        requestId: crypto.randomUUID(),
        expectedRevision: e.plan.revision,
      },
    });
    e = await (await page.request.get("/api/days/" + day)).json();
  }
  const r = await page.request.put("/api/days/" + day, {
    data: {
      requestId: crypto.randomUUID(),
      expectedRevision: e.plan.revision,
      tasks,
    },
  });
  expect(r.status()).toBe(200);
  return (await r.json()).plan;
}
const order = (page: Page) =>
  page
    .locator(".task-row")
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-task-id")));
test("six column orders and reset preserve exact saved records with no writes or source reads", async ({
  page,
}) => {
  const tasks = fixture();
  await seed(page, date, tasks);
  await page.request.post(source + "/control", { data: {} });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sort by Task", exact: true }),
  ).toBeVisible();
  const before = await (await page.request.get("/api/days/" + date)).json();
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/") && r.method() !== "GET") writes.push(r.url());
  });
  for (const [column, sequence] of [
    ["Task", [4, 8, 5, 7, 1, 2, 9, 6, 11, 3, 0, 10]],
    ["Task", [10, 0, 3, 11, 6, 1, 2, 9, 7, 5, 4, 8]],
    ["Weight", [1, 4, 10, 3, 6, 11, 2, 7, 9, 0, 5, 8]],
    ["Weight", [0, 5, 8, 2, 7, 9, 3, 6, 11, 1, 4, 10]],
    ["Status", [1, 3, 4, 5, 7, 9, 11, 0, 2, 6, 8, 10]],
    ["Status", [0, 2, 6, 8, 10, 1, 3, 4, 5, 7, 9, 11]],
  ] as [string, number[]][]) {
    await page
      .getByRole("button", { name: "Sort by " + column, exact: true })
      .click();
    await expect
      .poll(() => order(page))
      .toEqual(sequence.map((i) => tasks[i].id));
  }
  await page.getByRole("button", { name: "Reset sort", exact: true }).click();
  await expect.poll(() => order(page)).toEqual(tasks.map((t) => t.id));
  await expect(
    page.getByRole("button", { name: "Sort by Status", exact: true }),
  ).toBeFocused();
  expect(await (await page.request.get("/api/days/" + date)).json()).toEqual(
    before,
  );
  expect(writes).toEqual([]);
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(0);
  await page.getByRole("button", { name: "Finalize Day", exact: true }).click();
  await expect(page.getByText("● Finalized")).toBeVisible();
  const finalized = await (await page.request.get("/api/days/" + date)).json();
  await page
    .getByRole("button", { name: "Sort by Weight", exact: true })
    .click();
  expect(await (await page.request.get("/api/days/" + date)).json()).toEqual(
    finalized,
  );
});
test("editing freezes visible rows and saves changes in original order", async ({
  page,
}) => {
  const tasks = fixture();
  await seed(page, date, tasks);
  await page.goto("/");
  await page.getByRole("button", { name: "Sort by Task", exact: true }).click();
  const frozen = await order(page);
  await page.getByRole("button", { name: "Edit Plan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sort by Task", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Reset sort", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Sorting is paused while editing. Select Done to apply your sort.",
    ),
  ).toBeVisible();
  const first = page.locator(`[data-task-id="${tasks[4].id}"]`);
  await first.getByRole("textbox").fill("Zebra");
  await first.getByRole("textbox").press("Tab");
  await first.getByRole("combobox").selectOption("S");
  await expect.poll(() => order(page)).toEqual(frozen);
  await page.getByRole("button", { name: "＋ Add task" }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Aardvark");
  await page.getByLabel("Weight", { exact: true }).selectOption("M");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const withNew = await order(page);
  expect(withNew.slice(0, 12)).toEqual(frozen);
  await page
    .locator(`[data-task-id="${tasks[5].id}"]`)
    .getByRole("button", { name: "Remove Beta" })
    .click();
  await expect(page.locator(".save-state")).toHaveText("Saved");
  const saved = await (await page.request.get("/api/days/" + date)).json();
  expect(saved.plan.tasks.slice(0, 11).map((t: any) => t.id)).toEqual(
    tasks.filter((_, i) => i !== 5).map((t) => t.id),
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect.poll(async () => (await order(page))[0]).toBe(withNew[12]);
  await expect.poll(async () => (await order(page)).at(-1)).toBe(tasks[10].id);
});
test("status movement preserves focus and date navigation retains sort until reload", async ({
  page,
}) => {
  const tasks = fixture();
  await seed(page, date, tasks);
  const past = "2026-10-15";
  const history = fixture();
  await seed(page, past, history);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Sort by Status", exact: true })
    .click();
  const check = page
    .locator(`[data-task-id="${tasks[1].id}"]`)
    .getByRole("checkbox");
  await check.focus();
  await page.keyboard.press("Space");
  await expect(check).toBeChecked();
  await expect(check).toBeFocused();
  await expect
    .poll(() => order(page))
    .toEqual([3, 4, 5, 7, 9, 11, 0, 1, 2, 6, 8, 10].map((i) => tasks[i].id));
  await expect(page.locator(".save-state")).toHaveText("Saved");
  await page.getByLabel("View day").fill(past);
  await expect(
    page.getByRole("columnheader", { name: /Status/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect
    .poll(() => order(page))
    .toEqual([1, 3, 4, 5, 7, 9, 11, 0, 2, 6, 8, 10].map((i) => history[i].id));
  await page.reload();
  await page.getByLabel("View day").fill(past);
  await expect.poll(() => order(page)).toEqual(history.map((t) => t.id));
});
test("keyboard and responsive headers expose directions without overflow", async ({
  page,
}) => {
  const longTasks = fixture();
  longTasks[0].title = "Task " + "longtitle".repeat(10);
  await seed(page, date, longTasks);
  await page.request.post(source + "/control", {
    data: { projectName: "LongProjectName".repeat(6) },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Things Sync", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(14);
  await expect(page.locator(".sort-indicator")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sort by Weight", exact: true }),
  ).toHaveAttribute("title", "Weight");
  await expect(
    page.getByRole("button", { name: "Sort by Status", exact: true }),
  ).toHaveAttribute("title", "Status");
  mkdirSync("artifacts/task-sorting", { recursive: true });
  for (const width of [375, 800, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const column of ["Task", "Weight", "Status"]) {
      const button = page.getByRole("button", {
        name: "Sort by " + column,
        exact: true,
      });
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(button).toBeFocused();
      await expect(page.locator(".sort-indicator")).toHaveCount(1);
      await expect(
        page.locator('[role="columnheader"][aria-sort]'),
      ).toHaveCount(1);
      await page.keyboard.press("Space");
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/task-sorting/${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Reset sort", exact: true }).click();
  }
});
test("empty and single plans sort safely and 100 tasks update within a second", async ({
  page,
}) => {
  await seed(page, date, []);
  await page.goto("/");
  await page.getByRole("button", { name: "Sort by Task", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(0);
  const one = fixture().slice(0, 1);
  await seed(page, date, one);
  await page.reload();
  await page
    .getByRole("button", { name: "Sort by Weight", exact: true })
    .click();
  await expect.poll(() => order(page)).toEqual([one[0].id]);
  const many = Array.from({ length: 100 }, (_, i) => ({
    ...one[0],
    id: crypto.randomUUID(),
    title: "Task " + (100 - i),
  }));
  await seed(page, date, many);
  await page.reload();
  const start = Date.now();
  await page.getByRole("button", { name: "Sort by Task", exact: true }).click();
  await expect
    .poll(async () => (await order(page))[0], { timeout: 1000 })
    .toBe(many[99].id);
  expect(Date.now() - start).toBeLessThan(1000);
});
test("sorting stays active through explicit sync, failure and receipt-only recovery", async ({
  page,
}) => {
  const manual = fixture()
    .slice(0, 2)
    .map((t, i) => ({ ...t, title: i ? "A manual" : "Z manual" }));
  await seed(page, date, manual);
  await page.request.post(source + "/control", { data: {} });
  await page.goto("/");
  await page.getByRole("button", { name: "Sort by Task", exact: true }).click();
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(0);
  await page.getByRole("button", { name: "Things Sync", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(4);
  await expect(page.locator(".task-title-main")).toHaveText([
    "A manual",
    "Imported Things S",
    "Imported Things XL",
    "Z manual",
  ]);
  await expect(
    page.locator(".task-category").filter({ hasText: "Work" }),
  ).toHaveCount(1);
  await page.request.post(source + "/control", { data: { failure: true } });
  await page.getByRole("button", { name: "Things Sync", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  const failedReads = (
    await (await page.request.get(source + "/metrics")).json()
  ).reads;
  await page
    .getByRole("button", { name: "Sort by Weight", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(failedReads);
  await page.request.post(source + "/control", { data: { completed: true } });
  await page.route("**/api/days/" + date + "/things-sync", async (route) => {
    await route.fetch();
    await route.abort();
  });
  await page.getByRole("button", { name: "Things Sync", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Things Sync — recover result",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sort by Status", exact: true })
    .click();
  const count = (await (await page.request.get(source + "/metrics")).json())
    .reads;
  await page
    .getByRole("button", { name: "Things Sync — recover result", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Complete Imported Things XL",
      exact: true,
    }),
  ).toBeChecked();
  expect(
    (await (await page.request.get(source + "/metrics")).json()).reads,
  ).toBe(count);
  await expect(
    page.locator('[role="columnheader"][aria-sort]'),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(page.locator(".task-row")).toHaveCount(4);
});
test("failed edit saves keep sorted drafts and finalization releases the edit capture", async ({
  page,
}) => {
  const tasks = fixture();
  await seed(page, date, tasks);
  await page.goto("/");
  await page.getByRole("button", { name: "Sort by Task", exact: true }).click();
  await page.getByRole("button", { name: "Edit Plan", exact: true }).click();
  await page.route("**/api/days/" + date, (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue(),
  );
  const row = page.locator(`[data-task-id="${tasks[4].id}"]`);
  await row.getByRole("textbox").fill("Zebra draft");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry save", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sort by Weight", exact: true })
    .click();
  await expect(
    page.locator(".task-title-main").filter({ hasText: "Zebra draft" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Retry save", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/days/" + date);
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.locator(".save-state")).toHaveText("Saved");
  await page.getByRole("button", { name: "Edit Plan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sort by Weight", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Finalize Day", exact: true }).click();
  await expect(page.getByText("● Finalized")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sort by Weight", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Sort by Weight", exact: true })
    .click();
});
