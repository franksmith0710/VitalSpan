import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_CHROME,
  mergeAuxiliaryGridIntoSurface,
  resolveDashboardChrome,
  resolveDrillLevelColors,
} from "./dashboardChromeConfig";
import { mergeWidgetShellStyle } from "./dashboardStyleConfig";

describe("dashboardChromeConfig", () => {
  it("defaults chrome toggles to enabled", () => {
    expect(resolveDashboardChrome({})).toEqual(DEFAULT_DASHBOARD_CHROME);
  });

  it("respects explicit chrome opt-out", () => {
    expect(
      resolveDashboardChrome({
        chrome: { showFloatingActions: false, showChartLoadingHint: false },
      }),
    ).toMatchObject({
      showFloatingActions: false,
      showChartLoadingHint: false,
      showChartActionButtons: true,
      showAuxiliaryGrid: true,
    });
  });

  it("respects auxiliary grid opt-out", () => {
    expect(
      resolveDashboardChrome({
        chrome: { showAuxiliaryGrid: false },
      }).showAuxiliaryGrid,
    ).toBe(false);
  });

  it("layers auxiliary grid pattern over existing canvas background", () => {
    const merged = mergeAuxiliaryGridIntoSurface(
      { background: "#eff6ff" },
      "light",
      true,
    );
    expect(merged.background).toBe("#eff6ff");
    expect(String(merged.backgroundImage)).toContain("data:image/svg+xml");
  });

  it("falls back drill level colors", () => {
    expect(resolveDrillLevelColors({})).toHaveLength(3);
    expect(resolveDrillLevelColors({ drillLevelColors: ["#111111"] })[0]).toBe("#111111");
  });
});

describe("mergeWidgetShellStyle spacing", () => {
  it("applies custom border color and width", () => {
    const { style } = mergeWidgetShellStyle(
      { borderColor: "#ff0000", borderWidth: 2, borderStyle: "dashed" },
      "light",
    );
    expect(style.borderColor).toBe("#ff0000");
    expect(style.borderWidth).toBe(2);
    expect(style.borderStyle).toBe("dashed");
  });

  it("omits border when borderEnabled is false", () => {
    const { style } = mergeWidgetShellStyle({ borderEnabled: false, borderColor: "#ff0000" }, "light");
    expect(style.borderColor).toBeUndefined();
    expect(style.borderWidth).toBeUndefined();
  });

  it("does not render decorative frame overlay on global widget shell", () => {
    const { frameLayer } = mergeWidgetShellStyle(
      {
        backgroundMode: "frame",
        framePresetId: "frame-7",
        frameColor: "#3370ff",
      },
      "light",
    );
    expect(frameLayer).toBeNull();
  });

  it("applies default border when widgetStyle is empty", () => {
    const { style } = mergeWidgetShellStyle(undefined, "light");
    expect(style.borderWidth).toBe(1);
    expect(style.borderStyle).toBe("solid");
    expect(style.borderColor).toContain("--dashboard-widget-border");
  });

  it("applies unified padding and per-corner radius", () => {
    const { style } = mergeWidgetShellStyle({
      padding: 8,
      radiusMode: "individual",
      borderRadiusTopLeft: 4,
      borderRadiusTopRight: 6,
      borderRadiusBottomLeft: 8,
      borderRadiusBottomRight: 10,
      backdropBlur: 6,
    });
    expect(style.padding).toBe("8px");
    expect(style.borderRadius).toBe("4px 6px 10px 8px");
    expect(style.backdropFilter).toBe("blur(6px)");
  });
});
