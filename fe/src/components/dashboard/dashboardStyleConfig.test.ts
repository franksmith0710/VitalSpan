import { describe, expect, it } from "vitest";
import {
  CANVAS_BG_DARK_DEFAULT,
  CANVAS_BG_LIGHT_DEFAULT,
  canvasBackgroundStyle,
  canvasChromeUsesDotGrid,
  formatMetricValue,
  hasUserCanvasBackground,
  pickWidgetDashboardStyle,
  resolveArtboardStyle,
  widgetDashboardStyleFingerprint,
} from "./dashboardStyleConfig";

describe("dashboardStyleConfig theme vs background", () => {
  it("canvasBackgroundStyle only reflects explicit user background fields", () => {
    expect(canvasBackgroundStyle({ colorScheme: "dark" })).toEqual({});
    expect(canvasBackgroundStyle({ canvasBackground: "#f1c40f" })).toEqual({
      background: "#f1c40f",
    });
  });

  it("resolveArtboardStyle prefers user background over theme", () => {
    expect(
      resolveArtboardStyle({
        colorScheme: "dark",
        canvasBackground: "#f1c40f",
      }),
    ).toEqual({ background: "#f1c40f" });
  });

  it("resolveArtboardStyle uses theme default only when user background is unset", () => {
    expect(resolveArtboardStyle({ colorScheme: "dark" })).toEqual({
      background: CANVAS_BG_DARK_DEFAULT,
    });
    expect(resolveArtboardStyle({ colorScheme: "light" })).toEqual({
      background: CANVAS_BG_LIGHT_DEFAULT,
    });
  });

  it("layers background image in user background style", () => {
    expect(
      canvasBackgroundStyle({
        canvasBackground: "#ffffff",
        canvasBackgroundImage: "https://example.com/bg.png",
      }),
    ).toEqual({
      background: "#ffffff",
      backgroundImage: "url(https://example.com/bg.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });

  it("detects user canvas background for chrome suppression", () => {
    expect(hasUserCanvasBackground({ canvasBackground: "#abc" })).toBe(true);
    expect(hasUserCanvasBackground({ canvasBackgroundImage: " /a.png " })).toBe(true);
    expect(hasUserCanvasBackground({ colorScheme: "dark" })).toBe(false);
    expect(canvasChromeUsesDotGrid({ colorScheme: "dark" })).toBe(true);
    expect(canvasChromeUsesDotGrid({ canvasBackground: "#abc" })).toBe(false);
  });

  it("formats metrics with thousand separator by default", () => {
    expect(formatMetricValue(20_000_000, { type: "auto" })).toBe("20,000,000");
    expect(formatMetricValue(20_000_000, { type: "auto", thousandSeparator: false })).toBe(
      "20000000",
    );
  });

  it("pickWidgetDashboardStyle omits canvas-only fields", () => {
    const widgetStyle = pickWidgetDashboardStyle({
      colorScheme: "dark",
      canvasBackground: "#ff0000",
      canvasBackgroundImage: "https://example.com/bg.png",
      widgetGap: 12,
      pixelGutter: 8,
      themeAccent: "#465fff",
      actionIconColor: "#111111",
      paletteId: "tech",
      titleStyle: { fontSize: 14 },
    });
    expect(widgetStyle).toEqual({
      colorScheme: "dark",
      paletteId: "tech",
      titleStyle: { fontSize: 14 },
    });
    expect(widgetDashboardStyleFingerprint({ colorScheme: "dark", canvasBackground: "#a" })).toBe(
      widgetDashboardStyleFingerprint({ colorScheme: "dark", canvasBackground: "#b" }),
    );
  });
});
