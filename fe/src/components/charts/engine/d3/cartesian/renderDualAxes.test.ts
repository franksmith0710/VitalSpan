import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/charts/engine/d3/core/animate", () => ({
  animateStrokePath: vi.fn(),
}));

import { renderD3DualAxesChart } from "./renderDualAxes";

const theme = {
  legendText: "#333",
  axisLabel: "#666",
  gridLine: "#eee",
  accent: "#465fff",
} as const;

describe("renderD3DualAxesChart dual-line legend", () => {
  it("renders left and right line metric names in legend", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 320, configurable: true });

    renderD3DualAxesChart(container, {
      width: 480,
      height: 320,
      data: [
        [
          { __category__: "A", __value__: 10 },
          { __category__: "B", __value__: 20 },
        ],
        [
          { __category__: "A", __value__: 8 },
          { __category__: "B", __value__: 15 },
        ],
      ],
      xField: "__category__",
      yField: ["__value__", "__value__"],
      geometryOptions: [{ geometry: "line" }, { geometry: "line" }],
      colors: ["#465fff", "#12b76a"],
      theme,
      showLegend: true,
      lineLabels: ["左线", "右线"],
    });

    const labels = Array.from(container.querySelectorAll("g.vs-legend text")).map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toContain("左线");
    expect(labels).toContain("右线");
  });

  it("includes extBubble sub-series in dual-line legend", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 320, configurable: true });

    renderD3DualAxesChart(container, {
      width: 480,
      height: 320,
      data: [
        [{ __category__: "A", __value__: 10 }],
        [
          { __category__: "A", __value__: 8, __series__: "华东" },
          { __category__: "A", __value__: 6, __series__: "华北" },
        ],
      ],
      xField: "__category__",
      yField: ["__value__", "__value__"],
      geometryOptions: [{ geometry: "line" }, { geometry: "line" }],
      columnSeriesField: "__series__",
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme,
      showLegend: true,
      lineLabels: ["左线", "右线"],
    });

    const labels = Array.from(container.querySelectorAll("g.vs-legend text")).map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toContain("左线");
    expect(labels).toContain("华东");
    expect(labels).toContain("华北");
  });
});
