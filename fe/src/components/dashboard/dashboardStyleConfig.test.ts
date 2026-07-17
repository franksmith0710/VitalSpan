import { describe, expect, it } from "vitest";
import {
  CANVAS_BG_DARK_DEFAULT,
  CANVAS_BG_LIGHT_DEFAULT,
  canvasBackgroundStyle,
  canvasChromeUsesDotGrid,
  formatMetricValue,
  hasUserCanvasBackground,
  pickWidgetDashboardStyle,
  pickChartPaletteDefaults,
  resolveArtboardStyle,
  resolveDashboardFontOptionValue,
  widgetDashboardStyleFingerprint,
} from "./dashboardStyleConfig";

describe("dashboardStyleConfig theme vs background", () => {
  it("canvasBackgroundStyle only reflects explicit user background fields", () => {
    expect(canvasBackgroundStyle({ colorScheme: "dark" })).toEqual({});
    expect(canvasBackgroundStyle({ canvasBackground: "#f1c40f" })).toEqual({});
    expect(
      canvasBackgroundStyle({ canvasBackground: "#f1c40f", canvasBackgroundCustom: true }),
    ).toEqual({
      background: "#f1c40f",
    });
  });

  it("resolveArtboardStyle prefers user background over theme when scheme matches", () => {
    expect(
      resolveArtboardStyle({
        colorScheme: "light",
        canvasBackground: "#f1c40f",
        canvasBackgroundCustom: true,
      }),
    ).toEqual({ background: "#f1c40f" });
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "#0f172a",
        canvasBackgroundCustom: true,
      }),
    ).toEqual({ background: CANVAS_BG_DARK_DEFAULT });
  });

  it("resolveArtboardStyle preserves user custom canvas on dark theme", () => {
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "#7556b8",
        canvasBackgroundCustom: true,
      }),
    ).toEqual({ background: "#7556b8" });
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.35) 0%, transparent 55%)",
        canvasBackgroundCustom: true,
        canvasDecorPresetId: "gradient-radial",
      }),
    ).toMatchObject({
      background: expect.stringContaining("radial-gradient"),
    });
  });

  it("resolveArtboardStyle coerces gradient canvas when colorScheme is dark without custom flag", () => {
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "linear-gradient(160deg, #eff6ff 0%, #f8fafc 45%, #fef3c7 100%)",
      }),
    ).toEqual({ backgroundColor: CANVAS_BG_DARK_DEFAULT });
  });

  it("resolveArtboardStyle coerces medium-light canvas when colorScheme is dark without custom flag", () => {
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "#57617a",
      }),
    ).toEqual({ backgroundColor: CANVAS_BG_DARK_DEFAULT });
  });

  it("resolveArtboardStyle coerces light canvas when colorScheme is dark without custom flag", () => {
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "#ffffff",
      }),
    ).toEqual({ backgroundColor: CANVAS_BG_DARK_DEFAULT });
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "#eff6ff",
      }),
    ).toEqual({ backgroundColor: CANVAS_BG_DARK_DEFAULT });
  });

  it("resolveArtboardStyle ignores legacy canvas without custom flag", () => {
    expect(
      resolveArtboardStyle({
        colorScheme: "light",
        canvasBackground: "#eff6ff",
      }),
    ).toEqual({ backgroundColor: CANVAS_BG_LIGHT_DEFAULT });
  });

  it("resolveArtboardStyle uses theme default only when user background is unset", () => {
    expect(resolveArtboardStyle({ colorScheme: "dark" })).toEqual({
      backgroundColor: CANVAS_BG_DARK_DEFAULT,
    });
    expect(resolveArtboardStyle({ colorScheme: "light" })).toEqual({
      backgroundColor: CANVAS_BG_LIGHT_DEFAULT,
    });
  });

  it("layers background image in user background style", () => {
    expect(
      canvasBackgroundStyle({
        canvasBackground: "#ffffff",
        canvasBackgroundCustom: true,
        canvasBackgroundImage: "https://example.com/bg.png",
      }),
    ).toEqual({
      backgroundColor: "#ffffff",
      backgroundImage: 'url("https://example.com/bg.png")',
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });

  it("detects user canvas background for chrome suppression", () => {
    expect(
      hasUserCanvasBackground({ canvasBackground: "#abc", canvasBackgroundCustom: true }),
    ).toBe(true);
    expect(hasUserCanvasBackground({ canvasBackground: "#abc" })).toBe(false);
    expect(hasUserCanvasBackground({ canvasBackgroundImage: " /a.png " })).toBe(true);
    expect(hasUserCanvasBackground({ colorScheme: "dark" })).toBe(false);
    expect(canvasChromeUsesDotGrid({ colorScheme: "dark" })).toBe(true);
    expect(
      canvasChromeUsesDotGrid({ canvasBackground: "#abc", canvasBackgroundCustom: true }),
    ).toBe(false);
  });

  it("formats metrics with thousand separator by default", () => {
    expect(formatMetricValue(20_000_000, { type: "auto" })).toBe("20,000,000");
    expect(formatMetricValue(20_000_000, { type: "auto", thousandSeparator: false })).toBe(
      "20000000",
    );
  });

  it("pickWidgetDashboardStyle omits canvas-only fields but keeps chart palette", () => {
    const widgetStyle = pickWidgetDashboardStyle({
      colorScheme: "dark",
      canvasBackground: "#ff0000",
      canvasBackgroundImage: "https://example.com/bg.png",
      widgetGap: 12,
      pixelGutter: 8,
      themeAccent: "#465fff",
      actionIconColor: "#111111",
      paletteId: "tech",
      paletteOpacity: 0.75,
      seriesGradient: true,
      chartLabelShow: true,
      chartLabelStyle: { fontSize: 14, color: "#ff00ff" },
      chartTooltipStyle: { background: "#112233", fontSize: 13 },
      tableColorStyle: { headerBg: "#001122" },
      titleStyle: { fontSize: 14 },
    });
    expect(widgetStyle).toEqual({
      colorScheme: "dark",
      paletteId: "tech",
      paletteOpacity: 0.75,
      seriesGradient: true,
      chartLabelShow: true,
      chartLabelStyle: { fontSize: 14, color: "#ff00ff" },
      chartTooltipStyle: { background: "#112233", fontSize: 13 },
      tableColorStyle: { headerBg: "#001122" },
      titleStyle: { fontSize: 14 },
    });
    expect(pickChartPaletteDefaults(widgetStyle)).toEqual({
      paletteOpacity: 0.75,
      seriesGradient: true,
      chartLabelShow: true,
      chartLabelStyle: { fontSize: 14, color: "#ff00ff" },
      chartTooltipStyle: { background: "#112233", fontSize: 13 },
      tableColorStyle: { headerBg: "#001122" },
    });
    expect(widgetDashboardStyleFingerprint({ colorScheme: "dark", canvasBackground: "#a" })).toBe(
      widgetDashboardStyleFingerprint({ colorScheme: "dark", canvasBackground: "#b" }),
    );
    expect(
      widgetDashboardStyleFingerprint({
        colorScheme: "dark",
        paletteOpacity: 0.5,
      }),
    ).not.toBe(widgetDashboardStyleFingerprint({ colorScheme: "dark" }));
  });
});

describe("resolveDashboardFontOptionValue", () => {
  it("maps legacy niche fonts to current universal options", () => {
    expect(resolveDashboardFontOptionValue(undefined)).toBe("");
    expect(resolveDashboardFontOptionValue("Outfit, system-ui, sans-serif")).toBe(
      '"Microsoft YaHei", "PingFang SC", sans-serif',
    );
    expect(resolveDashboardFontOptionValue('"Noto Sans SC", system-ui, sans-serif')).toBe(
      '"Microsoft YaHei", "PingFang SC", sans-serif',
    );
  });
});

describe("dashboard component gap", () => {
  it("resolveWidgetGap maps presets and none", async () => {
    const { resolveWidgetGap, GAP_PRESET_PX } = await import("./dashboardStyleConfig");
    expect(resolveWidgetGap({ gapPreset: "none" })).toBe(0);
    expect(resolveWidgetGap({ gapPreset: "md" })).toBe(GAP_PRESET_PX.md);
    expect(resolveWidgetGap({ gapPreset: "custom", widgetGap: 10 })).toBe(10);
  });

  it("resolveDashboardComponentGap and shape gap CSS var", async () => {
    const {
      resolveDashboardComponentGap,
      resolvePixelGutter,
      dashboardShapeGapStyle,
      DASHBOARD_SHAPE_GAP_VAR,
    } = await import("./dashboardStyleConfig");
    expect(resolveDashboardComponentGap({})).toBe(0);
    expect(resolveDashboardComponentGap({ pixelGutter: 8 }, { pixel: true })).toBe(8);
    expect(resolveDashboardComponentGap({ gapPreset: "md" })).toBe(8);
    expect(dashboardShapeGapStyle(5)).toEqual({ [DASHBOARD_SHAPE_GAP_VAR]: "5px" });
    expect(resolvePixelGutter({ pixelGutter: 16 })).toBe(16);
  });
});
