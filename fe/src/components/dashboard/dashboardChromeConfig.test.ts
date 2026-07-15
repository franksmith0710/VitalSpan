import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_CHROME,
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
    });
  });

  it("falls back drill level colors", () => {
    expect(resolveDrillLevelColors({})).toHaveLength(3);
    expect(resolveDrillLevelColors({ drillLevelColors: ["#111111"] })[0]).toBe("#111111");
  });
});

describe("mergeWidgetShellStyle spacing", () => {
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
