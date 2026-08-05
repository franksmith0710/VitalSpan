import { describe, expect, it } from "vitest";
import { renderD3LineChart } from "@/components/charts/engine/d3/renderD3LineChart";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

const theme = getAntvThemeTokens("dark");

const baseData = [
  { __category__: "A", __value__: 10, __series__: "S1" },
  { __category__: "B", __value__: 20, __series__: "S1" },
  { __category__: "A", __value__: 15, __series__: "S2" },
  { __category__: "B", __value__: 25, __series__: "S2" },
];

describe("renderD3LineChart", () => {
  it("draws stroke paths but skips area fill for basic line", () => {
    setChartAnimationSuppressed(true);
    const host = document.createElement("div");
    host.style.width = "320px";
    host.style.height = "200px";
    document.body.appendChild(host);

    renderD3LineChart(host, {
      width: 320,
      height: 200,
      data: baseData,
      xField: "__category__",
      yField: "__value__",
      seriesField: "__series__",
      colors: ["#3b82f6", "#ef4444"],
      theme,
    });

    expect(host.querySelectorAll("path[stroke]").length).toBeGreaterThan(0);
    expect(host.querySelectorAll(".line-area-fill").length).toBe(0);

    host.remove();
    setChartAnimationSuppressed(false);
  });

  it("draws area fill when area mode or areaOpacity is configured", () => {
    setChartAnimationSuppressed(true);
    const host = document.createElement("div");
    document.body.appendChild(host);

    renderD3LineChart(host, {
      width: 320,
      height: 200,
      data: baseData,
      xField: "__category__",
      yField: "__value__",
      seriesField: "__series__",
      colors: ["#3b82f6", "#ef4444"],
      theme,
      area: true,
    });

    expect(host.querySelectorAll(".line-area-fill").length).toBe(2);

    host.replaceChildren();
    renderD3LineChart(host, {
      width: 320,
      height: 200,
      data: baseData,
      xField: "__category__",
      yField: "__value__",
      seriesField: "__series__",
      colors: ["#3b82f6", "#ef4444"],
      theme,
      areaOpacity: 0.3,
    });

    expect(host.querySelectorAll(".line-area-fill").length).toBe(2);
    host.remove();
    setChartAnimationSuppressed(false);
  });

  it("applies custom lineWidth to stroke paths", () => {
    setChartAnimationSuppressed(true);
    const host = document.createElement("div");
    document.body.appendChild(host);

    renderD3LineChart(host, {
      width: 320,
      height: 200,
      data: baseData,
      xField: "__category__",
      yField: "__value__",
      seriesField: "__series__",
      colors: ["#3b82f6"],
      theme,
      lineWidth: 4,
    });

    const stroke = host.querySelector("path[stroke]");
    expect(stroke?.getAttribute("stroke-width")).toBe("4");

    host.remove();
    setChartAnimationSuppressed(false);
  });
});
