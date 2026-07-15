import { describe, expect, it } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  inferWidgetSyncScopes,
  mergeChartTitleStyle,
  patchChartDeStyleNested,
  stripChartLabelFormatOverrides,
  stripChartPaletteOverrides,
  stripChartQueryLimitOverride,
  stripChartTitlePresentationOverrides,
  stripChartWidgetAppearanceOverrides,
  syncChartWidgetsForDashboardScopes,
  syncChartWidgetsForDashboardTitleStyle,
  widgetStyleToContentCss,
} from "./chartDeStyle";

const baseCfg: ChartViewConfig = { chartType: "bar", dataSourceId: "ds-1" };

describe("widgetStyleToContentCss", () => {
  it("applies individual padding and unified radius", () => {
    const style = widgetStyleToContentCss({
      background: "#ffffff",
      paddingMode: "individual",
      paddingTop: 4,
      paddingRight: 8,
      paddingBottom: 12,
      paddingLeft: 16,
      borderRadius: 6,
    });
    expect(style.padding).toBe("4px 8px 12px 16px");
    expect(style.borderRadius).toBe("6px");
    expect(style.background).toBe("#ffffff");
  });

  it("applies backdrop blur and background image", () => {
    const style = widgetStyleToContentCss({
      backgroundImage: "https://example.com/bg.png",
      backdropBlur: 8,
      opacity: 0.9,
    });
    expect(style.backgroundImage).toContain("example.com/bg.png");
    expect(style.backdropFilter).toBe("blur(8px)");
    expect(style.opacity).toBe(0.9);
  });
});

describe("mergeChartTitleStyle", () => {
  it("uses dashboard titleStyle when chart has no presentation override", () => {
    const style = mergeChartTitleStyle(
      { fontSize: 20, color: "#112233" },
      baseCfg,
      "light",
    );
    expect(style).toEqual({ fontSize: "20px", color: "#112233" });
  });

  it("chart deStyle.title still overrides dashboard titleStyle", () => {
    const cfg = patchChartDeStyleNested(baseCfg, "title", { fontSize: 24, color: "#ff0000" });
    const style = mergeChartTitleStyle({ fontSize: 14, color: "#112233" }, cfg, "light");
    expect(style.fontSize).toBe("24px");
    expect(style.color).toBe("#ff0000");
  });
});

describe("stripChartTitlePresentationOverrides", () => {
  it("removes fontSize/color but keeps show", () => {
    const cfg = patchChartDeStyleNested(baseCfg, "title", {
      show: false,
      fontSize: 22,
      color: "#aabbcc",
      align: "center",
    });
    const next = stripChartTitlePresentationOverrides(cfg);
    expect(next.nativeBody?.deStyle?.title).toEqual({ show: false });
  });
});

describe("syncChartWidgetsForDashboardTitleStyle", () => {
  it("clears per-chart title presentation on all chart widgets", () => {
    const widgets = syncChartWidgetsForDashboardTitleStyle([
      {
        id: "w1",
        type: "chart",
        title: "A",
        colSpan: 6,
        rowSpan: 4,
        chartConfig: patchChartDeStyleNested(baseCfg, "title", { fontSize: 18 }),
      },
      {
        id: "w2",
        type: "text",
        title: "B",
        colSpan: 6,
        rowSpan: 2,
        textConfig: { content: "hi" },
      },
    ]);
    expect(widgets[0].type === "chart" && widgets[0].chartConfig?.nativeBody?.deStyle?.title).toBe(
      undefined,
    );
    expect(widgets[1]).toEqual({
      id: "w2",
      type: "text",
      title: "B",
      colSpan: 6,
      rowSpan: 2,
      textConfig: { content: "hi" },
    });
  });
});

describe("dashboard widget style sync", () => {
  it("inferWidgetSyncScopes maps patch keys to scopes", () => {
    expect(inferWidgetSyncScopes({ titleStyle: { fontSize: 16 } })).toEqual(new Set(["title"]));
    expect(inferWidgetSyncScopes({ widgetStyle: { padding: 8 } })).toEqual(
      new Set(["widgetAppearance"]),
    );
    expect(inferWidgetSyncScopes({ paletteId: "ocean" })).toEqual(new Set(["palette"]));
    expect(inferWidgetSyncScopes({ numberFormat: { decimals: 2 } })).toEqual(
      new Set(["numberFormat"]),
    );
    expect(inferWidgetSyncScopes({ defaultQueryLimit: 500 })).toEqual(new Set(["queryLimit"]));
    expect(inferWidgetSyncScopes({ chrome: { showAuxiliaryGrid: false } })).toEqual(new Set());
  });

  it("syncChartWidgetsForDashboardScopes clears matching overrides", () => {
    const cfg = patchChartDeStyleNested(baseCfg, "title", { fontSize: 20 });
    const withBg = patchChartDeStyleNested(cfg, "background", { background: "#fff" });
    const withPalette = {
      ...withBg,
      nativeBody: {
        ...withBg.nativeBody,
        deStyle: {
          ...withBg.nativeBody?.deStyle,
          paletteId: "custom",
          label: { formatType: "percent", fontSize: 12 },
        },
        deDisplay: { resultLimit: "500" },
      },
    };
    const widgets = syncChartWidgetsForDashboardScopes(
      [
        {
          id: "w1",
          type: "chart",
          title: "A",
          colSpan: 6,
          rowSpan: 4,
          chartConfig: withPalette,
        },
      ],
      new Set(["widgetAppearance", "palette", "numberFormat", "queryLimit"]),
    );
    const de = widgets[0].type === "chart" ? widgets[0].chartConfig?.nativeBody?.deStyle : undefined;
    const display =
      widgets[0].type === "chart" ? widgets[0].chartConfig?.nativeBody?.deDisplay : undefined;
    expect(de?.background).toBeUndefined();
    expect(de?.paletteId).toBeUndefined();
    expect(de?.label).toEqual({ fontSize: 12 });
    expect(display).toBeUndefined();
    expect(de?.title?.fontSize).toBe(20);
  });

  it("strip helpers are no-ops when override absent", () => {
    expect(stripChartWidgetAppearanceOverrides(baseCfg)).toBe(baseCfg);
    expect(stripChartPaletteOverrides(baseCfg)).toBe(baseCfg);
    expect(stripChartLabelFormatOverrides(baseCfg)).toBe(baseCfg);
    expect(stripChartQueryLimitOverride(baseCfg)).toBe(baseCfg);
  });
});
