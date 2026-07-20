import React from "react";
import { vi } from "vitest";

class MockPlot {
  render() {}
  destroy() {}
  changeData() {}
  changeSize() {}
  on() {
    return this;
  }
}

const plotExports = [
  "Line",
  "Column",
  "Bar",
  "Pie",
  "Gauge",
  "Scatter",
  "DualAxes",
  "Funnel",
  "Sankey",
  "Heatmap",
  "WordCloud",
  "BidirectionalBar",
  "Waterfall",
  "Liquid",
  "Radar",
  "Treemap",
  "CirclePacking",
] as const;

vi.mock("@antv/g2plot", () => {
  const out: Record<string, typeof MockPlot> = {};
  for (const name of plotExports) out[name] = MockPlot;
  return out;
});

vi.mock("@antv/g6", () => ({
  Graph: class MockGraph {
    render() {}
    destroy() {}
    on() {
      return this;
    }
    setSize() {}
  },
}));

vi.mock("@antv/g2", () => ({
  Chart: class MockChart {
    constructor() {}
    polygon() {
      return this;
    }
    data() {
      return this;
    }
    encode() {
      return this;
    }
    scale() {
      return this;
    }
    style() {
      return this;
    }
    tooltip() {
      return this;
    }
    interaction() {
      return this;
    }
    on() {
      return this;
    }
    render() {}
    destroy() {}
  },
}));

vi.mock("@antv/s2-react", () => ({
  TableSheet: ({
    dataCfg,
  }: {
    dataCfg?: {
      fields?: { columns?: string[] };
      data?: Array<Record<string, string | number>>;
    };
  }) =>
    React.createElement(
      "div",
      { "data-testid": "antv-s2-sheet" },
      ...(dataCfg?.fields?.columns ?? []).map((column) =>
        React.createElement("span", { key: column }, column),
      ),
      ...(dataCfg?.data ?? []).slice(0, 50).map((row, index) =>
        React.createElement(
          "span",
          { key: index, role: "cell" },
          String(Object.values(row)[0] ?? ""),
        ),
      ),
    ),
}));
