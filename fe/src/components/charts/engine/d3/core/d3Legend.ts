import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";

export type D3LegendItem = { label: string; color: string };

export type D3LegendLayout = {
  position: "top" | "bottom" | "left" | "right";
  orient: "horizontal" | "vertical";
};

const ICON = 10;
const GAP = 6;
const PAD = 8;

function itemSize(label: string, orient: "horizontal" | "vertical"): { w: number; h: number } {
  const textW = Math.max(label.length * 6.5, 16);
  if (orient === "vertical") return { w: ICON + GAP + textW, h: ICON + 4 };
  return { w: ICON + GAP + textW + PAD, h: ICON + 4 };
}

/** 在 SVG 根节点绘制内联图例（对标 DE 图例位置/方向） */
export function layoutD3InlineLegend(
  root: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  items: D3LegendItem[],
  opts: {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    theme: AntvThemeTokens;
    layout: D3LegendLayout;
  },
): void {
  if (items.length === 0) return;
  root.selectAll("g.vs-legend").remove();

  const { width, height, margin, theme, layout } = opts;
  const orient = layout.orient;
  const sizes = items.map((it) => itemSize(it.label, orient));
  const blockW =
    orient === "horizontal" ? sizes.reduce((s, x) => s + x.w, 0) : Math.max(...sizes.map((x) => x.w));
  const blockH =
    orient === "horizontal" ? Math.max(...sizes.map((x) => x.h)) : sizes.reduce((s, x) => s + x.h, 0);

  let x = margin.left;
  let y = 10;
  if (layout.position === "top") {
    x = margin.left + Math.max(0, (width - margin.left - margin.right - blockW) / 2);
    y = 8;
  } else if (layout.position === "bottom") {
    x = margin.left + Math.max(0, (width - margin.left - margin.right - blockW) / 2);
    y = height - margin.bottom - blockH - 4;
  } else if (layout.position === "left") {
    x = 8;
    y = margin.top + Math.max(0, (height - margin.top - margin.bottom - blockH) / 2);
  } else {
    x = width - margin.right - blockW - 8;
    y = margin.top + Math.max(0, (height - margin.top - margin.bottom - blockH) / 2);
  }

  const legend = root.append("g").attr("class", "vs-legend").attr("transform", `translate(${x},${y})`);
  let offsetX = 0;
  let offsetY = 0;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const size = sizes[i]!;
    const g = legend.append("g").attr("transform", `translate(${offsetX},${offsetY})`);
    g.append("rect")
      .attr("width", ICON)
      .attr("height", ICON)
      .attr("y", 1)
      .attr("rx", 2)
      .attr("fill", item.color);
    g.append("text")
      .attr("x", ICON + GAP)
      .attr("y", 10)
      .attr("fill", theme.legendText)
      .style("font-size", "11px")
      .text(item.label);
    if (orient === "horizontal") offsetX += size.w;
    else offsetY += size.h;
  }
}
