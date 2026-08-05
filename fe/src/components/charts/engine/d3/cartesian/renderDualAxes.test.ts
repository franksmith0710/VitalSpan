import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/charts/engine/d3/core/animate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/charts/engine/d3/core/animate")>();
  return {
    ...actual,
    animateStrokePath: vi.fn(),
  };
});

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

  it("renders tiered x-axis for multi-part category keys", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 280, configurable: true });

    const SEP = "\u0001";
    const keys = [
      `2025-06-08${SEP}上海市${SEP}27寸显示器${SEP}显示设备`,
      `2025-06-08${SEP}广东省${SEP}无线鼠标${SEP}外设配件`,
      `2025-07-01${SEP}四川省${SEP}机械键盘${SEP}外设配件`,
    ];

    renderD3DualAxesChart(container, {
      width: 480,
      height: 280,
      data: [
        keys.map((cat, i) => ({ __category__: cat, __value__: 10 + i })),
        keys.map((cat, i) => ({ __category__: cat, __value__: 5 + i })),
      ],
      xField: "__category__",
      yField: ["__value__", "__value__"],
      geometryOptions: [{ geometry: "line" }, { geometry: "column" }],
      colors: ["#465fff", "#12b76a"],
      theme,
      showLegend: false,
      lineLabels: ["线", "柱"],
      categoryLevelCount: 4,
    });

    expect(container.querySelector(".vs-axis-x-tiered")).toBeTruthy();
    const axisLabels = [...container.querySelectorAll(".vs-axis-x-tiered text")].map((n) => n.textContent);
    expect(axisLabels.some((t) => t?.includes("2025"))).toBe(true);
  });
});
