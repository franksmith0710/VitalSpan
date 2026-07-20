import { expect, test, type Page } from "@playwright/test";

const DS_ID = "00000000-0000-4000-8000-000000000010";
const SCREEN_ID = "ds-resize-e2e";

const TABLE_WIDGET = {
  id: "w-table-1",
  type: "chart",
  title: "销售明细",
  order: 0,
  x: 120,
  y: 80,
  width: 480,
  height: 320,
  chartConfig: {
    chartType: "table-info",
    chartId: "w-table-1",
    mode: "sql",
    dataSourceId: DS_ID,
    sql: "SELECT region, amount FROM sales LIMIT 10",
    dimensions: [{ field: "region" }],
    metrics: [{ field: "amount" }],
  },
};

const DATA_SCREEN_LAYOUT = {
  version: 2,
  canvas: { width: 1920, height: 1080 },
  widgets: [TABLE_WIDGET],
  globalFilters: [],
  styleConfig: { surfaceKind: "data-screen", colorScheme: "dark" },
};

async function mockDataScreenEditApis(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("vitalspan:access_token", "e2e-token");
  });

  await page.route("**/api/v1/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "u1", username: "admin", roles: ["admin"] }),
    });
  });

  await page.route("**/api/v1/datasources**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [{ id: DS_ID, name: "分析库", code: "analytics" }] }),
    });
  });

  await page.route("**/api/v1/datasets**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.route("**/api/v1/charts/types**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          type: "table-info",
          displayName: "明细表",
          styleVariants: ["default"],
          fieldRule: {},
          renderer: "antv",
        },
      ]),
    });
  });

  await page.route(`**/api/v1/dashboards/${SCREEN_ID}/global-filters`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ filters: [], linkageRules: [] }),
    });
  });

  await page.route(`**/api/v1/dashboards/${SCREEN_ID}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: SCREEN_ID,
          name: "Resize E2E 大屏",
          layoutJson: DATA_SCREEN_LAYOUT,
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/v1/query/execute**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        columns: ["region", "amount"],
        rows: [
          ["华东", 120],
          ["华北", 98],
        ],
      }),
    });
  });
}

test("data-screen resize keeps chart container aligned with widget outer box", async ({ page }) => {
  await mockDataScreenEditApis(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/admin/data-screens/${SCREEN_ID}/edit`);

  await expect(page.getByTestId("dashboard-name-field")).toContainText("Resize E2E 大屏", {
    timeout: 20_000,
  });

  const shape = page.locator('[data-testid="pixel-shape-w-table-1"]');
  await expect(shape).toBeVisible({ timeout: 15_000 });

  const before = await shape.evaluate((el) => ({
    outerWidth: el.clientWidth,
    outerHeight: el.clientHeight,
    containerWidth: el.querySelector(".dashboard-widget-body")?.clientWidth ?? 0,
    containerHeight: el.querySelector(".dashboard-widget-body")?.clientHeight ?? 0,
  }));
  expect(before.outerWidth).toBeGreaterThan(0);
  expect(before.containerWidth).toBeGreaterThan(0);

  const handle = page.getByLabel("调整组件大小：右下");
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 8 });
  await page.mouse.up();

  await expect
    .poll(async () => {
      return shape.evaluate((el) => ({
        outerWidth: el.clientWidth,
        outerHeight: el.clientHeight,
        containerWidth: el.querySelector(".dashboard-widget-body")?.clientWidth ?? 0,
        containerHeight: el.querySelector(".dashboard-widget-body")?.clientHeight ?? 0,
      }));
    })
    .toMatchObject({
      outerWidth: expect.any(Number),
      containerWidth: expect.any(Number),
    });

  const after = await shape.evaluate((el) => ({
    outerWidth: el.clientWidth,
    outerHeight: el.clientHeight,
    containerWidth: el.querySelector(".dashboard-widget-body")?.clientWidth ?? 0,
    containerHeight: el.querySelector(".dashboard-widget-body")?.clientHeight ?? 0,
  }));

  expect(Math.abs(after.outerWidth - after.containerWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.outerHeight - after.containerHeight)).toBeLessThanOrEqual(2);
  expect(after.outerWidth).toBeGreaterThan(before.outerWidth);
  expect(after.containerWidth).toBeGreaterThan(before.containerWidth);
});
