import * as d3 from "d3";
import { resolveEffectiveDepth, type DepthVisualLevel } from "@/components/charts/engine/d3/core/depthEngine";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";
import {
  blurPackNode,
  createPackPhysicsNodes,
  createPackPhysicsSimulation,
  enforcePackBounds,
  fitPackLayoutToPlot,
  focusPackNode,
  isPackMotionActive,
  normalizePackDt,
  packNodeRadius,
  pickPackNodeAt,
  resolvePackEdgeInset,
  resolvePackPlotCircle,
  stepPackMotionFrame,
  type PackPhysicsNode,
} from "@/components/charts/engine/d3/hierarchy/circlePackingPhysics";

type PackDatum = { name: string; value: number };
type TreeNode = { name: string; value?: number; children?: TreeNode[] };

const PACK_PLOT_PAD = 4;
const PACK_LAYOUT_PADDING_DEFAULT = 0;

function positionTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  event: MouseEvent,
  container: HTMLElement,
  width: number,
) {
  const rect = container.getBoundingClientRect();
  tooltip
    .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
    .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
}

function packCircleStroke(fill: string, depthLevel: DepthVisualLevel): string {
  const parsed = d3.color(fill);
  if (!parsed) return "rgba(15, 23, 42, 0.65)";
  const darken = depthLevel === "enhanced" ? 0.85 : depthLevel === "standard" ? 0.7 : 0.55;
  return parsed.darker(darken).formatRgb();
}

function appendPackPlotChrome(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  innerW: number,
  innerH: number,
  theme: D3RenderConfig["theme"],
): string {
  const { cx, cy, radius } = resolvePackPlotCircle(innerW, innerH);

  root
    .append("circle")
    .attr("class", "pack-plot-frame")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", theme.axisLabel)
    .attr("stroke-opacity", 0.55);

  const clipId = `vs-pack-clip-${Math.random().toString(36).slice(2, 9)}`;
  root
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", radius);
  return clipId;
}

function packLeaves(
  data: PackDatum[],
  width: number,
  height: number,
  layoutPadding: number,
): d3.HierarchyCircularNode<TreeNode>[] {
  const root = d3
    .hierarchy<TreeNode>({ name: "root", children: data })
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  d3.pack<TreeNode>().size([width, height]).padding(layoutPadding)(root);
  return root.descendants().filter((d) => d.depth > 0) as d3.HierarchyCircularNode<TreeNode>[];
}

export function renderD3CirclePackingChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const { width, height, colors, theme, showLabel, showTooltip, valueFormat, options, onPointClick, depthVisual, labelFontSize = 11 } =
    config;
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const data = (options.data as PackDatum[]) ?? [];
  const layoutPadding = Number(options.__circlePackingPadding ?? PACK_LAYOUT_PADDING_DEFAULT);
  const labelMinRadius = Number(options.__circlePackingLabelMinRadius ?? 18);
  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const innerW = Math.max(0, width - PACK_PLOT_PAD * 2);
  const innerH = Math.max(0, height - PACK_PLOT_PAD * 2);
  const strokeWidth = depthLevel === "off" ? 1.5 : 1;

  const packed = packLeaves(data, innerW, innerH, layoutPadding);
  const rawLayout = packed.map((d) => ({ name: d.data.name, x: d.x, y: d.y, r: d.r }));
  const maxR = rawLayout.length > 0 ? Math.max(...rawLayout.map((d) => d.r)) : 0;
  const avgR =
    rawLayout.length > 0 ? rawLayout.reduce((sum, d) => sum + d.r, 0) / rawLayout.length : maxR;
  const edgeMargin = resolvePackEdgeInset(avgR, strokeWidth);
  const layout = fitPackLayoutToPlot(rawLayout, innerW, innerH, edgeMargin);

  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(layout.map((d) => d.name))
    .range(colors);

  const physicsNodes = createPackPhysicsNodes(layout);
  const simulation = createPackPhysicsSimulation(physicsNodes, innerW, innerH, strokeWidth);
  simulation.alpha(0);
  simulation.alphaTarget(0);

  let hovered: PackPhysicsNode | null = null;
  let visualFrame: number | null = null;
  let lastFrameMs: number | null = null;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr("data-pixel-no-drag", "true")
    .style("touch-action", "none");

  const plot = svg.append("g").attr("transform", `translate(${PACK_PLOT_PAD},${PACK_PLOT_PAD})`);
  const clipId = appendPackPlotChrome(plot, innerW, innerH, theme);
  const layer = plot.append("g").attr("clip-path", `url(#${clipId})`);

  const tooltip = showTooltip ? createTooltip(container, theme, config.tooltipPresentation) : null;
  const groups = layer
    .selectAll<SVGGElement, PackPhysicsNode>("g.pack-node")
    .data(physicsNodes)
    .join("g")
    .attr("class", "pack-node")
    .attr("transform", (d) => `translate(${d.x ?? d.targetX},${d.y ?? d.targetY})`);

  const labels = showLabel
    ? groups
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "#fff")
        .style("pointer-events", "none")
        .text((d) => d.name)
    : null;

  const updateVisual = () => {
    groups.attr("transform", (d) => `translate(${d.x ?? d.targetX},${d.y ?? d.targetY})`);
    groups.select("circle").attr("r", (d) => packNodeRadius(d));
    if (labels) {
      labels.style("font-size", (d) => `${Math.min(labelFontSize + 3, Math.max(9, packNodeRadius(d) / 3))}px`);
      labels.text((d) => (packNodeRadius(d) > labelMinRadius ? d.name : ""));
    }
  };

  const stopVisualPump = () => {
    if (visualFrame !== null) {
      cancelAnimationFrame(visualFrame);
      visualFrame = null;
    }
  };

  const pumpVisual = (now: number) => {
    const dt = normalizePackDt(lastFrameMs == null ? 16.67 : now - lastFrameMs);
    lastFrameMs = now;

    stepPackMotionFrame(physicsNodes, {
      width: innerW,
      height: innerH,
      strokeWidth,
      interaction: hovered ? "hover" : "idle",
      dt,
    });
    updateVisual();

    if (isPackMotionActive(physicsNodes, hovered ? "hover" : "idle")) {
      visualFrame = requestAnimationFrame(pumpVisual);
    } else {
      visualFrame = null;
      lastFrameMs = null;
    }
  };

  const ensureVisualPump = () => {
    if (visualFrame === null) {
      lastFrameMs = null;
      visualFrame = requestAnimationFrame(pumpVisual);
    }
  };

  const beginHover = (d: PackPhysicsNode) => {
    if (hovered === d) {
      ensureVisualPump();
      return;
    }
    if (hovered) blurPackNode(hovered);
    hovered = d;
    focusPackNode(d);
    simulation.setInteraction("hover");
    simulation.stop();
    simulation.alphaTarget(0);
    ensureVisualPump();
  };

  const endHover = () => {
    if (!hovered) return;
    blurPackNode(hovered);
    hovered = null;
    simulation.setInteraction("idle");
    simulation.stop();
    simulation.alphaTarget(0);
    ensureVisualPump();
  };

  const handlePointerMove = (event: PointerEvent) => {
    const layerEl = layer.node();
    if (!layerEl) return;
    const [x, y] = d3.pointer(event, layerEl);
    const hit = pickPackNodeAt(physicsNodes, x, y);
    if (hit) {
      beginHover(hit);
      d3.select(groups.nodes().find((el) => (d3.select(el).datum() as PackPhysicsNode).name === hit.name)).raise();
    } else {
      endHover();
    }

    if (tooltip && hit) {
      const packedNode = packed.find((item) => item.data.name === hit.name);
      tooltip
        .style("opacity", "1")
        .html(
          `<div style="font-weight:600;margin-bottom:2px">${hit.name}</div>` +
            `<div><strong>${formatChartValue(packedNode?.value ?? 0, valueFormat)}</strong></div>`,
        );
      positionTooltip(tooltip, event, container, width);
    } else {
      tooltip?.style("opacity", "0");
    }
  };

  groups
    .append("circle")
    .attr("r", (d) => packNodeRadius(d))
    .attr("fill", (d) => colorScale(d.name) ?? colors[0] ?? "#465fff")
    .attr("opacity", 0.92)
    .attr("stroke", (d) => packCircleStroke(colorScale(d.name) ?? colors[0] ?? "#465fff", depthLevel))
    .attr("stroke-opacity", 0.92)
    .attr("stroke-width", strokeWidth)
    .style("paint-order", depthLevel === "off" ? undefined : "stroke fill")
    .style("cursor", "default")
    .style("pointer-events", "all")
    .on("pointerdown", (event, d) => {
      event.stopPropagation();
      beginHover(d);
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      const packedNode = packed.find((item) => item.data.name === d.name);
      onPointClick?.({ name: d.name, value: packedNode?.value ?? 0 } as D3Datum);
    });

  layer
    .style("pointer-events", "all")
    .on("pointermove", handlePointerMove)
    .on("pointerleave", () => {
      endHover();
      tooltip?.style("opacity", "0");
    });

  simulation.on("tick", updateVisual);

  simulation.on("end", () => {
    if (hovered) return;
    for (const node of physicsNodes) {
      node.x = node.targetX;
      node.y = node.targetY;
      node.vx = 0;
      node.vy = 0;
    }
    enforcePackBounds(physicsNodes, innerW, innerH, strokeWidth);
    updateVisual();
  });

  return () => {
    stopVisualPump();
    lastFrameMs = null;
    simulation.stop();
    container.replaceChildren();
  };
}
