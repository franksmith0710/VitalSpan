import { describe, expect, it } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  inferWidgetSyncScopes,
  mergeChartTitleStyle,
  mergeShapeInnerPresentation,
  patchChartDeStyleNested,
  readChartLegendVisible,
  readChartTitleVisible,
  resolveChartContentShellStyle,
  stripChartLabelFormatOverrides,
  stripChartPaletteOverrides,
  stripChartQueryLimitOverride,
  stripChartTitleOverrides,
  stripChartWidgetAppearanceOverrides,
  syncChartWidgetsForDashboardScopes,
  syncChartWidgetsForDashboardTitleStyle,
  mergeShapeInnerPresentation,
  widgetStyleToContentCss,
} from "./chartDeStyle";
import { mergeWidgetShellStyle } from "@/components/dashboard/dashboardStyleConfig";

const baseCfg: ChartViewConfig = { chartType: "bar", dataSourceId: "ds-1" };

describe("widgetStyleToContentCss", () => {
  it("applies individual padding and unified radius", () => {
    const { surface } = widgetStyleToContentCss({
      background: "#ffffff",
      paddingMode: "individual",
      paddingTop: 4,
      paddingRight: 8,
      paddingBottom: 12,
      paddingLeft: 16,
      borderRadius: 6,
    });
    expect(surface.padding).toBe("4px 8px 12px 16px");
    expect(surface.borderRadius).toBe("6px");
    expect(surface.background).toBe("#ffffff");
  });

  it("applies backdrop blur and background-only opacity", () => {
    const { surface, backgroundLayer } = widgetStyleToContentCss({
      backgroundImage: "https://example.com/bg.png",
      backdropBlur: 8,
      opacity: 0.9,
    });
    expect(surface.opacity).toBeUndefined();
    expect(surface.backdropFilter).toBeUndefined();
    expect(backgroundLayer?.backgroundImage).toContain("example.com/bg.png");
    expect(backgroundLayer?.backdropFilter).toBe("blur(8px)");
    expect(backgroundLayer?.opacity).toBe(0.9);
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

describe("stripChartTitleOverrides", () => {
  it("removes entire title block", () => {
    const cfg = patchChartDeStyleNested(baseCfg, "title", {
      show: false,
      fontSize: 22,
      color: "#aabbcc",
    });
    expect(stripChartTitleOverrides(cfg).nativeBody?.deStyle?.title).toBeUndefined();
  });
});

describe("readChartLegendVisible", () => {
  it("defaults visible in embedded widgets until explicitly disabled", () => {
    expect(readChartLegendVisible({}, { embedded: true })).toBe(true);
    expect(readChartLegendVisible({ legend: { show: true } }, { embedded: true })).toBe(true);
    expect(readChartLegendVisible({ legend: { show: false } }, { embedded: true })).toBe(false);
  });

  it("defaults visible in full-size preview", () => {
    expect(readChartLegendVisible({})).toBe(true);
    expect(readChartLegendVisible({ legend: { show: false } })).toBe(false);
  });
});

describe("readChartTitleVisible", () => {
  it("falls back to global titleStyle.show", () => {
    expect(readChartTitleVisible(baseCfg, { show: false })).toBe(false);
    const hidden = patchChartDeStyleNested(baseCfg, "title", { show: false });
    expect(readChartTitleVisible(hidden, { show: true })).toBe(false);
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
  });

  it("strip helpers are no-ops when override absent", () => {
    expect(stripChartWidgetAppearanceOverrides(baseCfg)).toBe(baseCfg);
    expect(stripChartPaletteOverrides(baseCfg)).toBe(baseCfg);
    expect(stripChartLabelFormatOverrides(baseCfg)).toBe(baseCfg);
    expect(stripChartQueryLimitOverride(baseCfg)).toBe(baseCfg);
  });
});

describe("resolveChartContentShellStyle", () => {
  it("merges per-chart background and border onto shape-inner shell", () => {
    let cfg = patchChartDeStyleNested(baseCfg, "background", { background: "#abcdef" });
    cfg = patchChartDeStyleNested(cfg, "border", { show: true, color: "#112233", width: 2 });
    const resolved = resolveChartContentShellStyle({ borderEnabled: false }, cfg, "light");
    expect(resolved.inner).toEqual({});
    expect(resolved.outer.style.background).toBe("#abcdef");
    expect(resolved.outer.style.borderColor).toBe("#112233");
    expect(resolved.outer.style.borderWidth).toBe(2);
  });
});

describe("mergeShapeInnerPresentation", () => {
  it("keeps global widget shell on shape-inner and chart inner on shape-content", () => {
    const outer = mergeWidgetShellStyle({ padding: 12, borderRadius: 8 }, "light");
    const { surface } = widgetStyleToContentCss({ background: "#f5f5f5" }, "light");
    const merged = mergeShapeInnerPresentation({
      outer,
      inner: surface,
      innerBackgroundLayer: null,
      innerFrameLayer: null,
    });
    expect(merged.shell.style.padding).toBe("12px");
    expect(merged.shell.style.borderRadius).toBe("8px");
    expect(merged.shell.style.background).toBeUndefined();
    expect(merged.content.style.background).toBe("#f5f5f5");
  });

  it("applies global border color onto shape-inner shell", () => {
    const outer = mergeWidgetShellStyle({ borderColor: "#ff0000" }, "light");
    const merged = mergeShapeInnerPresentation({
      outer,
      inner: {},
      innerBackgroundLayer: null,
      innerFrameLayer: null,
    });
    expect(merged.shell.style.borderColor).toBe("#ff0000");
    expect(merged.shell.style.borderWidth).toBe(1);
    expect(merged.shell.style.borderStyle).toBe("solid");
  });

  it("includes decorative frame overlay on shape-inner shell layers", () => {
    const cfg = patchChartDeStyleNested(baseCfg, "background", {
      backgroundShow: true,
      backgroundMode: "frame",
      framePresetId: "frame-1",
    });
    const shell = resolveChartContentShellStyle(undefined, cfg, "light");
    const merged = mergeShapeInnerPresentation({
      outer: shell.outer,
      inner: shell.inner,
      innerBackgroundLayer: shell.innerBackgroundLayer,
      innerFrameLayer: shell.innerFrameLayer,
    });
    expect(merged.shell.backgroundLayers[1]?.backgroundImage).toContain("data:image/svg+xml");
  });
});
