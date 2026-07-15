import { describe, expect, it } from "vitest";
import {
  deriveAccentChartPalette,
  themeAccentToScopeVars,
} from "./dashboardAccentScope";

describe("dashboardAccentScope", () => {
  it("deriveAccentChartPalette uses accent as first series color", () => {
    const palette = deriveAccentChartPalette("#3195c4");
    expect(palette[0]).toBe("#3195c4");
    expect(palette.length).toBeGreaterThan(3);
  });

  it("themeAccentToScopeVars exposes accent and chart primary", () => {
    const vars = themeAccentToScopeVars("#465fff");
    expect(vars["--dashboard-accent"]).toBe("#465fff");
    expect(vars["--dashboard-chart-primary"]).toBe("#465fff");
  });
});
