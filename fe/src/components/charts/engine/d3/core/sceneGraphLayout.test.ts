import { describe, expect, it } from "vitest";
import {
  appendChartSvg,
  resolveCategoryCartesianLayout,
  resolveHorizontalCategoryCartesianLayout,
} from "@/components/charts/engine/d3/core/sceneGraph";

describe("sceneGraph layout helpers", () => {
  it("resolveCategoryCartesianLayout thins ticks without extra bottom margin by default", () => {
    const categories = Array.from({ length: 16 }, (_, i) => `类目${i + 1}`);
    const layout = resolveCategoryCartesianLayout(200, 180, categories);
    expect(layout.xLayout.ticks.length).toBeLessThan(categories.length);
    expect(layout.xLayout.rotateDeg).toBe(0);
    expect(layout.margin.bottom).toBe(44);
    expect(layout.innerW).toBeGreaterThan(0);
    expect(layout.innerH).toBeGreaterThan(0);
  });

  it("resolveCategoryCartesianLayout reserves bottom margin when labelRotate is auto", () => {
    const categories = Array.from({ length: 16 }, (_, i) => `类目${i + 1}`);
    const layout = resolveCategoryCartesianLayout(200, 180, categories, {
      axisStyle: { x: { labelRotate: "auto" } },
    });
    expect(layout.xLayout.ticks.length).toBeLessThan(categories.length);
    expect(layout.margin.bottom).toBeGreaterThan(44);
  });

  it("resolveHorizontalCategoryCartesianLayout expands left margin for long labels", () => {
    const categories = Array.from({ length: 12 }, (_, i) => `2024年第${i + 1}季度`);
    const layout = resolveHorizontalCategoryCartesianLayout(320, 200, categories);
    expect(layout.yLayout.ticks.length).toBeLessThan(categories.length);
    expect(layout.margin.left).toBeGreaterThanOrEqual(52);
    expect(layout.innerW).toBeGreaterThan(0);
    expect(layout.innerH).toBeGreaterThan(0);
  });

  it("appendChartSvg creates vs-chart-svg with overflow visible", () => {
    const container = document.createElement("div");
    const svg = appendChartSvg(container, 400, 300);
    expect(svg.attr("class")).toBe("vs-chart-svg");
    expect(svg.style("overflow")).toBe("visible");
    expect(svg.attr("width")).toBe("400");
    expect(svg.attr("height")).toBe("300");
  });
});
