import { describe, expect, it } from "vitest";
import { createBarChartOptions, createLineChartOptions, getApexThemeOverrides } from "@/lib/chart-theme";

describe("chart-theme stroke", () => {
  it("line chart does not use transparent stroke", () => {
    const options = createLineChartOptions(["2025-01-01", "2025-01-02"]);
    expect(options.stroke?.colors?.[0]).not.toBe("transparent");
  });

  it("bar chart keeps transparent stroke for rounded bars", () => {
    const options = createBarChartOptions(["A", "B"]);
    expect(options.stroke?.colors).toEqual(["transparent"]);
  });

  it("apex overrides follow dashboard colorScheme tokens", () => {
    const dark = getApexThemeOverrides("dark");
    const light = getApexThemeOverrides("light");
    expect(dark.tooltip?.theme).toBe("dark");
    expect(dark.chart?.foreColor).toBe("#98a2b3");
    expect(light.tooltip?.theme).toBe("light");
    expect(light.chart?.foreColor).toBe("#667085");
  });
});
