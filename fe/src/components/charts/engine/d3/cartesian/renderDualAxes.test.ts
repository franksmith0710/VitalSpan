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

describe("renderD3DualAxesChart column+line DE parity", () => {
  it("renders column bars and line path for province quantity amount", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 320, configurable: true });

    renderD3DualAxesChart(container, {
      width: 480,
      height: 320,
      data: [
        [
          { __category__: "华东", __value__: 100 },
          { __category__: "华北", __value__: 200 },
          { __category__: "华南", __value__: 150 },
        ],
        [
          { __category__: "华东", __value__: 10000 },
          { __category__: "华北", __value__: 15000 },
          { __category__: "华南", __value__: 12000 },
        ],
      ],
      xField: "__category__",
      yField: ["__value__", "__value__"],
      geometryOptions: [{ geometry: "column" }, { geometry: "line" }],
      colors: ["#465fff", "#12b76a"],
      theme,
      showLegend: true,
      lineLabels: ["quantity", "amount"],
    });

    expect(container.querySelectorAll("g.dual-col").length).toBe(3);
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(1);
    const labels = Array.from(container.querySelectorAll("g.vs-legend text")).map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toEqual(["quantity", "amount"]);
  });
});

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

  it("renders multiple line paths for column+line with lineSeriesField", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 480, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 320, configurable: true });

    renderD3DualAxesChart(container, {
      width: 480,
      height: 320,
      data: [
        [
          { __category__: "2025-07-01", __value__: 100 },
          { __category__: "2025-07-02", __value__: 200 },
        ],
        [
          { __category__: "2025-07-01", __value__: 80, __series__: "华东" },
          { __category__: "2025-07-01", __value__: 60, __series__: "华北" },
          { __category__: "2025-07-02", __value__: 120, __series__: "华东" },
          { __category__: "2025-07-02", __value__: 90, __series__: "华北" },
        ],
      ],
      xField: "__category__",
      yField: ["__value__", "__value__"],
      geometryOptions: [{ geometry: "column", isStack: true }, { geometry: "line" }],
      columnSeriesField: undefined,
      lineSeriesField: "__series__",
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme,
      showLegend: true,
      lineLabels: ["amount", "quantity"],
    });

    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
    const labels = Array.from(container.querySelectorAll("g.vs-legend text")).map((n) =>
      n.textContent?.trim(),
    );
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
      geometryOptions: [{ geometry: "column" }, { geometry: "line" }],
      colors: ["#465fff", "#12b76a"],
      theme,
      showLegend: false,
      lineLabels: ["柱", "线"],
      categoryLevelCount: 4,
    });

    expect(container.querySelector(".vs-axis-x-tiered")).toBeTruthy();
    const axisLabels = [...container.querySelectorAll(".vs-axis-x-tiered text")].map((n) => n.textContent);
    expect(axisLabels.some((t) => t?.includes("2025"))).toBe(true);
  });
});
