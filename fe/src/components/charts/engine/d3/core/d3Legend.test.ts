import { describe, expect, it } from "vitest";
import * as d3 from "d3";
import { layoutD3InlineLegend, reserveLegendMargin } from "./d3Legend";

const theme = {
  legendText: "#333",
  axisLabel: "#666",
  gridLine: "#eee",
  accent: "#465fff",
} as const;

describe("reserveLegendMargin", () => {
  it("extends bottom margin for default bottom legend", () => {
    const base = { top: 8, right: 8, bottom: 8, left: 8 };
    const items = [
      { label: "系列 A", color: "#f00" },
      { label: "系列 B", color: "#0f0" },
    ];
    const margin = reserveLegendMargin(base, 400, 200, { position: "bottom" }, items);
    expect(margin.bottom).toBeGreaterThan(base.bottom);
  });
});

describe("layoutD3InlineLegend", () => {
  it("renders legend in the reserved margin band", () => {
    const container = document.createElement("div");
    const root = d3.select(container).append("svg").attr("width", 400).attr("height", 200);
    const margin = reserveLegendMargin(
      { top: 8, right: 8, bottom: 8, left: 8 },
      400,
      200,
      { position: "bottom" },
      [{ label: "华北", color: "#465fff" }],
    );

    layoutD3InlineLegend(root, [{ label: "华北", color: "#465fff" }], {
      width: 400,
      height: 200,
      margin,
      theme,
      layout: { position: "bottom" },
    });

    const legend = container.querySelector("g.vs-legend");
    expect(legend).not.toBeNull();
    const transform = legend?.getAttribute("transform") ?? "";
    const y = Number(transform.match(/translate\([^,]+,([^)]+)\)/)?.[1] ?? 0);
    expect(y).toBeGreaterThan(200 - margin.bottom);
  });
});
