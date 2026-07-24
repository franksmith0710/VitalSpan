import { describe, expect, it } from "vitest";
import * as d3 from "d3";
import {
  estimateLegendBlockSize,
  layoutD3InlineLegend,
  packHorizontalLegendRows,
  reserveLegendMargin,
  type D3LegendItem,
} from "./d3Legend";

const theme = {
  legendText: "#333",
  axisLabel: "#666",
  gridLine: "#eee",
  accent: "#465fff",
} as const;

function makeItems(count: number): D3LegendItem[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `系列${i + 1}`,
    color: "#465fff",
  }));
}

describe("packHorizontalLegendRows", () => {
  it("wraps items when a single row cannot fit", () => {
    const rows = packHorizontalLegendRows(makeItems(12), 180, 11, 10);
    expect(rows.length).toBeGreaterThan(1);
  });
});

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

  it("reserves more bottom space when many legend items wrap", () => {
    const base = { top: 8, right: 8, bottom: 28, left: 8 };
    const few = reserveLegendMargin(base, 400, 220, { position: "bottom" }, makeItems(2));
    const many = reserveLegendMargin(base, 400, 220, { position: "bottom" }, makeItems(16));
    expect(many.bottom).toBeGreaterThan(few.bottom);
  });
});

describe("estimateLegendBlockSize", () => {
  it("matches wrapped row count for many items", () => {
    const margin = { top: 8, right: 8, bottom: 28, left: 8 };
    const items = makeItems(16);
    const innerW = 400 - margin.left - margin.right;
    const rows = packHorizontalLegendRows(items, innerW, 11, 10);
    const size = estimateLegendBlockSize(items, { position: "bottom" }, 400, 220, margin);
    expect(size.height).toBeGreaterThanOrEqual(rows.length * 19);
  });
});

describe("layoutD3InlineLegend", () => {
  it("renders legend below axis band at the bottom margin", () => {
    const container = document.createElement("div");
    const root = d3.select(container).append("svg").attr("width", 400).attr("height", 220);
    const base = { top: 8, right: 8, bottom: 28, left: 8 };
    const items = makeItems(16);
    const margin = reserveLegendMargin(base, 400, 220, { position: "bottom" }, items);

    layoutD3InlineLegend(root, items, {
      width: 400,
      height: 220,
      margin,
      theme,
      layout: { position: "bottom" },
    });

    const legend = container.querySelector("g.vs-legend");
    expect(legend).not.toBeNull();
    const transform = legend?.getAttribute("transform") ?? "";
    const y = Number(transform.match(/translate\([^,]+,([^)]+)\)/)?.[1] ?? 0);
    const size = estimateLegendBlockSize(items, { position: "bottom" }, 400, 220, margin);
    expect(y).toBeGreaterThanOrEqual(220 - size.height - 8);
    expect(y + size.height).toBeLessThanOrEqual(220);
  });

  it("places wrapped items on multiple rows instead of one long row", () => {
    const container = document.createElement("motion.div");
    const root = d3.select(container).append("svg").attr("width", 400).attr("height", 220);
    const items = makeItems(16);
    const margin = reserveLegendMargin(
      { top: 8, right: 8, bottom: 28, left: 8 },
      400,
      220,
      { position: "bottom" },
      items,
    );

    layoutD3InlineLegend(root, items, {
      width: 400,
      height: 220,
      margin,
      theme,
      layout: { position: "bottom" },
    });

    const transforms = Array.from(container.querySelectorAll<SVGGElement>("g.vs-legend > g")).map(
      (node) => node.getAttribute("transform") ?? "",
    );
    const ys = new Set(
      transforms.map((value) => Number(value.match(/translate\([^,]+,([^)]+)\)/)?.[1] ?? 0)),
    );
    expect(ys.size).toBeGreaterThan(1);
  });
});
