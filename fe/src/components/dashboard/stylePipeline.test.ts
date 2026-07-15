import { describe, expect, it } from "vitest";
import { resolveComponentGapRuntime } from "./componentGapRuntime";
import {
  dashboardLayoutPersistRoundtrip,
  hydrateDashboardStyle,
  resolveEffectiveDashboardStyle,
  syncPixelLayoutChartStyles,
} from "./stylePipeline";

const pixelLayout = {
  version: 2 as const,
  canvas: { width: 1440, height: 900 },
  widgets: [
    {
      id: "w1",
      type: "chart" as const,
      title: "销量趋势",
      order: 0,
      x: 0,
      y: 0,
      width: 1440,
      height: 280,
      chartConfig: {
        chartType: "line" as const,
        chartId: "w1",
        mode: "sql" as const,
        dataSourceId: "00000000-0000-4000-8000-000000000001",
        sql: "SELECT 1",
        dimensions: [{ field: "sale_date" }],
        metrics: [{ field: "amount" }],
      },
    },
    {
      id: "w2",
      type: "chart" as const,
      title: "饼图",
      order: 1,
      x: 0,
      y: 300,
      width: 480,
      height: 260,
      chartConfig: {
        chartType: "pie" as const,
        chartId: "w2",
        mode: "sql" as const,
        dataSourceId: "00000000-0000-4000-8000-000000000001",
        sql: "SELECT 1",
        dimensions: [{ field: "region" }],
        metrics: [{ field: "amount" }],
      },
    },
  ],
  globalFilters: [],
};

describe("stylePipeline", () => {
  it("hydrate legacy widgetGap matches pixel runtime before and after persist", () => {
    const live = hydrateDashboardStyle({ widgetGap: 8, colorScheme: "dark" });
    expect(resolveComponentGapRuntime(live, "pixel").shellPaddingPx).toBe(5);

    const { saved } = dashboardLayoutPersistRoundtrip(pixelLayout, live, true);
    const reloaded = hydrateDashboardStyle(saved.styleConfig);
    expect(resolveComponentGapRuntime(reloaded, "pixel").shellPaddingPx).toBe(5);
  });

  it("resolveEffective prefers liveStyle over stale layout.styleConfig", () => {
    const effective = resolveEffectiveDashboardStyle(
      {
        ...pixelLayout,
        styleConfig: { gapPreset: "none", widgetGap: 0, pixelGutter: 0 },
      },
      { gapPreset: "md", widgetGap: 8, pixelGutter: 5 },
    );
    expect(effective.gapPreset).toBe("md");
    expect(resolveComponentGapRuntime(effective, "pixel").shellPaddingPx).toBe(5);
  });

  it("persist roundtrip preserves widget geometry", () => {
    const style = hydrateDashboardStyle({ gapPreset: "md", colorScheme: "dark" });
    const { saved } = dashboardLayoutPersistRoundtrip(pixelLayout, style, true);
    expect(saved.widgets[0]).toMatchObject({ x: 0, y: 0, width: 1440, height: 280 });
    expect(saved.widgets[1]).toMatchObject({ x: 0, y: 300, width: 480, height: 260 });
  });

  it("syncPixelLayoutChartStyles keeps pixel geometry", () => {
    const synced = syncPixelLayoutChartStyles(
      { ...pixelLayout, styleConfig: { colorScheme: "dark" } },
      "dark",
    );
    expect(synced.widgets[0]).toMatchObject({ x: 0, y: 0, width: 1440, height: 280 });
    expect(synced.widgets[1]).toMatchObject({ x: 0, y: 300, width: 480, height: 260 });
  });
});
