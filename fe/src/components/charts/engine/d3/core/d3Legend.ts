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
  color?: string;
  hAlign?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
};

export type ChartMargin = { top: number; right: number; bottom: number; left: number };

type LayoutOpts = {
  width: number;
  height: number;
  margin: ChartMargin;
  theme: AntvThemeTokens;
  layout?: D3LegendLayout;
  fontSize?: number;
};

const LEGEND_GAP = 6;
const LEGEND_FALLBACK_ROW_H = 22;
const LEGEND_FALLBACK_COL_W = 80;

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

function itemLabelWidth(item: D3LegendItem, fontSize: number, iconSize: number): number {
  const iconW = item.marker === "line" ? (item.markerWidth ?? 14) : iconSize;
  return item.label.length * fontSize * 0.62 + iconW + 16;
}

export function resolveInlineLegendOrient(layout?: D3LegendLayout): boolean {
  if (layout?.orient) return layout.orient === "horizontal";
  const position = layout?.position ?? "bottom";
  return position === "top" || position === "bottom";
}

/** 估算图例占位（横向时按绘图区宽度折行） */
export function estimateLegendBlockSize(
  items: D3LegendItem[],
  layout: D3LegendLayout | undefined,
  width: number,
  height: number,
  margin: ChartMargin,
): { width: number; height: number } {
  const fontSize = layout?.fontSize ?? 11;
  const iconSize = layout?.iconSize ?? 10;
  const horizontal = resolveInlineLegendOrient(layout);
  const rowH = Math.max(iconSize, fontSize) + 8;

  if (items.length === 0) {
    const position = layout?.position ?? "bottom";
    if (position === "left" || position === "right") {
      return { width: LEGEND_FALLBACK_COL_W, height: rowH * 2 };
    }
    return { width: width - margin.left - margin.right, height: LEGEND_FALLBACK_ROW_H };
  }

  if (!horizontal) {
    return {
      width: Math.max(...items.map((item) => itemLabelWidth(item, fontSize, iconSize)), 48),
      height: items.length * rowH,
    };
  }

  const innerW = Math.max(0, width - margin.left - margin.right);
  const totalW = items.reduce((sum, item) => sum + itemLabelWidth(item, fontSize, iconSize), 0);
  if (innerW > 0 && totalW > innerW) {
    const rows = Math.ceil(totalW / innerW);
    return { width: innerW, height: rows * rowH + 4 };
  }
  return { width: totalW, height: rowH };
}

/** 按图例位置扩展绘图边距，避免内联图例压住坐标轴/序列 */
export function reserveLegendMargin(
  margin: ChartMargin,
  width: number,
  height: number,
  layout: D3LegendLayout | undefined,
  items: D3LegendItem[],
): ChartMargin {
  if (items.length === 0 && !layout) return margin;

  const position = layout?.position ?? "bottom";
  const size = estimateLegendBlockSize(items, layout, width, height, margin);
  const pad = LEGEND_GAP;

  switch (position) {
    case "top":
      return { ...margin, top: margin.top + size.height + pad };
    case "bottom":
      return { ...margin, bottom: margin.bottom + size.height + pad };
    case "left":
      return { ...margin, left: margin.left + size.width + pad };
    case "right":
      return { ...margin, right: margin.right + size.width + pad };
    default:
      return margin;
  }
}

function legendOrigin(
  opts: LayoutOpts,
  items: D3LegendItem[],
  horizontal: boolean,
  iconSize: number,
  fontSize: number,
): { x: number; y: number } {
  const position = opts.layout?.position ?? "bottom";
  const hAlign = opts.layout?.hAlign ?? "left";
  const vAlign = opts.layout?.vAlign ?? "top";
  const { width, height, margin } = opts;
  const size = estimateLegendBlockSize(items, opts.layout, width, height, margin);

  let x = margin.left;
  let y = margin.top;

  switch (position) {
    case "bottom":
      y = height - margin.bottom + 4;
      break;
    case "left":
      x = Math.max(4, (margin.left - size.width) / 2);
      y = margin.top;
      break;
    case "right":
      x = width - margin.right + 4;
      y = margin.top;
      break;
    case "top":
    default:
      y = Math.max(4, (margin.top - size.height) / 2);
      break;
  }

  if (position === "top" || position === "bottom") {
    if (hAlign === "center") x = Math.max(margin.left, (width - size.width) / 2);
    if (hAlign === "right") x = Math.max(margin.left, width - margin.right - size.width);
  }

  if (position === "left" || position === "right") {
    const plotH = Math.max(0, height - margin.top - margin.bottom);
    if (vAlign === "middle") y = margin.top + Math.max(0, (plotH - size.height) / 2);
    if (vAlign === "bottom") y = margin.top + Math.max(0, plotH - size.height);
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
  const horizontal = resolveInlineLegendOrient(opts.layout);
  const fontSize = opts.layout?.fontSize ?? opts.fontSize ?? 11;
  const textColor = opts.layout?.color ?? opts.theme.legendText;
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
      .attr("fill", textColor)
      .style("font-size", `${fontSize}px`)
      .text(item.label);

    const rowH = Math.max(resolved.height, fontSize) + 8;
    const rowW = itemLabelWidth(item, fontSize, defaultIconSize);
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
