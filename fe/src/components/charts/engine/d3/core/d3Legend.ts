import type { Selection } from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { ChartLegendIconShape } from "@/lib/chartDeStyle";
import { normalizeLegendIconShape } from "@/lib/chartLegendPresentation";

export type D3LegendMarker = "rect" | "line" | "circle" | "triangle" | "diamond";

export type D3LegendItem = {
  label: string;
  color: string;
  marker?: D3LegendMarker;
  markerWidth?: number;
  markerHeight?: number;
};

export type D3LegendLayout = {
  position?: "top" | "bottom" | "left" | "right";
  orient?: "horizontal" | "vertical";
  icon?: ChartLegendIconShape;
  iconSize?: number;
  fontSize?: number;
  hAlign?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
};

type LayoutOpts = {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  theme: AntvThemeTokens;
  layout?: D3LegendLayout;
  fontSize?: number;
};

function resolveMarker(
  item: D3LegendItem,
  layout?: D3LegendLayout,
): { marker: D3LegendMarker; size: number; width: number; height: number } {
  if (item.marker === "line") {
    return {
      marker: "line",
      size: item.markerWidth ?? 14,
      width: item.markerWidth ?? 14,
      height: item.markerHeight ?? 3,
    };
  }
  const size = item.markerWidth ?? layout?.iconSize ?? 10;
  const marker = item.marker ?? normalizeLegendIconShape(layout?.icon ?? "rect");
  return { marker, size, width: size, height: size };
}

function estimateLegendSize(
  items: D3LegendItem[],
  horizontal: boolean,
  fontSize: number,
  iconSize: number,
): { width: number; height: number } {
  if (items.length === 0) return { width: 0, height: 0 };
  if (horizontal) {
    const width = items.reduce((sum, item) => {
      const w = item.marker === "line" ? (item.markerWidth ?? 14) : iconSize;
      return sum + item.label.length * 7 + w + 24;
    }, 0);
    return { width, height: Math.max(iconSize, fontSize) + 6 };
  }
  return {
    width: Math.max(...items.map((item) => item.label.length * 7 + iconSize + 24), 48),
    height: items.length * (Math.max(iconSize, fontSize) + 8),
  };
}

function legendOrigin(
  opts: LayoutOpts,
  items: D3LegendItem[],
  horizontal: boolean,
  iconSize: number,
  fontSize: number,
): { x: number; y: number } {
  const position = opts.layout?.position ?? "top";
  const hAlign = opts.layout?.hAlign ?? "left";
  const vAlign = opts.layout?.vAlign ?? "top";
  const { width, height, margin } = opts;
  const size = estimateLegendSize(items, horizontal, fontSize, iconSize);

  let x = margin.left;
  let y = 10;

  switch (position) {
    case "bottom":
      y = height - margin.bottom + 6;
      break;
    case "left":
      x = 8;
      y = margin.top;
      break;
    case "right":
      x = width - margin.right - size.width;
      y = margin.top;
      break;
    case "top":
    default:
      x = margin.left;
      y = 10;
      break;
  }

  if (position === "top" || position === "bottom") {
    if (hAlign === "center") x = Math.max(margin.left, (width - size.width) / 2);
    if (hAlign === "right") x = Math.max(margin.left, width - margin.right - size.width);
  }

  if (position === "left" || position === "right") {
    if (vAlign === "middle") y = Math.max(margin.top, (height - size.height) / 2);
    if (vAlign === "bottom") y = Math.max(margin.top, height - margin.bottom - size.height);
  }

  return { x, y };
}

function appendLegendIcon(
  g: Selection<SVGGElement, unknown, null, undefined>,
  marker: D3LegendMarker,
  width: number,
  height: number,
  color: string,
) {
  const y = 1;
  switch (marker) {
    case "line":
      g.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("y", y + (10 - height) / 2)
        .attr("rx", 2)
        .attr("fill", color);
      return width;
    case "circle":
      g.append("circle").attr("cx", width / 2).attr("cy", y + height / 2).attr("r", width / 2).attr("fill", color);
      return width;
    case "triangle":
      g.append("path")
        .attr("d", `M ${width / 2} ${y} L ${width} ${y + height} L 0 ${y + height} Z`)
        .attr("fill", color);
      return width;
    case "diamond":
      g.append("path")
        .attr("d", `M ${width / 2} ${y} L ${width} ${y + height / 2} L ${width / 2} ${y + height} L 0 ${y + height / 2} Z`)
        .attr("fill", color);
      return width;
    case "rect":
    default:
      g.append("rect").attr("width", width).attr("height", height).attr("y", y).attr("rx", 2).attr("fill", color);
      return width;
  }
}

/** 在 SVG 根节点绘制内联图例（对标 DE 图例位置/方向/图标） */
export function layoutD3InlineLegend(
  root: Selection<SVGSVGElement, unknown, null, undefined>,
  items: D3LegendItem[],
  opts: LayoutOpts,
): void {
  if (items.length === 0) return;

  root.selectAll("g.vs-legend").remove();
  const horizontal = (opts.layout?.orient ?? "horizontal") === "horizontal";
  const fontSize = opts.layout?.fontSize ?? opts.fontSize ?? 11;
  const defaultIconSize = opts.layout?.iconSize ?? 10;
  const { x, y } = legendOrigin(opts, items, horizontal, defaultIconSize, fontSize);
  const legend = root.append("g").attr("class", "vs-legend").attr("transform", `translate(${x},${y})`);
  let offsetX = 0;
  let offsetY = 0;

  for (const item of items) {
    const resolved = resolveMarker(item, opts.layout);
    const g = legend.append("g").attr("transform", `translate(${offsetX},${offsetY})`);
    const iconW = appendLegendIcon(g, resolved.marker, resolved.width, resolved.height, item.color);
    g.append("text")
      .attr("x", iconW + 4)
      .attr("y", Math.max(resolved.height, fontSize))
      .attr("fill", opts.theme.legendText)
      .style("font-size", `${fontSize}px`)
      .text(item.label);

    const rowH = Math.max(resolved.height, fontSize) + 8;
    const rowW = item.label.length * 7 + iconW + 24;
    if (horizontal) {
      offsetX += rowW;
    } else {
      offsetY += rowH;
    }
  }
}

/** 按 showLegend 开关绘制内联图例 */
export function renderConfiguredInlineLegend(
  root: Selection<SVGSVGElement, unknown, null, undefined>,
  showLegend: boolean,
  items: D3LegendItem[],
  opts: LayoutOpts,
): void {
  if (!showLegend || items.length === 0) {
    root.selectAll("g.vs-legend").remove();
    return;
  }
  layoutD3InlineLegend(root, items, opts);
}
