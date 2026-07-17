import { describe, expect, it } from "vitest";
import { applyEchartsColorSchemeTokens, getEchartsTheme } from "./echarts-theme";

describe("echarts-theme", () => {
  it("dark theme sets legend and axis label colors", () => {
    const theme = getEchartsTheme("dark");
    expect(theme.legend).toMatchObject({
      textStyle: { color: "#e2e8f0" },
    });
    expect(theme.textStyle).toMatchObject({ color: "#cbd5e1" });
  });

  it("applyEchartsColorSchemeTokens patches pie legend and labels", () => {
    const option = applyEchartsColorSchemeTokens(
      {
        series: [{ type: "pie", data: [{ name: "A", value: 1 }] }],
        legend: { show: true },
      },
      "dark",
    );
    expect(option.legend).toMatchObject({
      textStyle: { color: "#e2e8f0" },
    });
    expect((option.series as Array<{ label?: { color?: string } }>)[0].label?.color).toBe(
      "#cbd5e1",
    );
  });

  it("preserves explicit pie label color from deStyle", () => {
    const option = applyEchartsColorSchemeTokens(
      {
        series: [
          {
            type: "pie",
            data: [{ name: "A", value: 1 }],
            label: { show: true, color: "#ff5500" },
          },
        ],
      },
      "dark",
    );
    expect((option.series as Array<{ label?: { color?: string } }>)[0].label?.color).toBe(
      "#ff5500",
    );
  });
});
