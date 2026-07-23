import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
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
  stepPackMotionFrame,
  type PackPhysicsNode,
  type PackPhysicsSimulation,
} from "@/components/charts/engine/d3/hierarchy/circlePackingPhysics";

type PackDatum = { name: string; value?: number; children?: PackDatum[] };
type TreeNode = PackDatum;

const PACK_PLOT_PAD = 4;

function indexChildren(nodes: PackDatum[], map: Map<string, PackDatum[]>) {
  for (const node of nodes) {
    if (node.children?.length) map.set(node.name, node.children);
    if (node.children) indexChildren(node.children, map);
  }
}

function packLeaves(data: PackDatum[], width: number, height: number) {
  const root = d3
    .hierarchy<TreeNode>({ name: "root", children: data })
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  d3.pack<TreeNode>().size([width, height]).padding(0)(root);
  return root.descendants().filter((d) => d.depth > 0) as d3.HierarchyCircularNode<TreeNode>[];
}

function packCircleStroke(fill: string, depthLevel: DepthVisualLevel): string {
  const parsed = d3.color(fill);
  if (!parsed) return "rgba(15, 23, 42, 0.65)";
  const darken = depthLevel === "enhanced" ? 0.85 : depthLevel === "standard" ? 0.7 : 0.55;
  return parsed.darker(darken).formatRgb();
}

export function renderD3CirclePackingChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const { width, height, colors, theme, showLabel, showTooltip, valueFormat, options, onPointClick, depthVisual } =
    config;
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const rootData = (options.data as PackDatum[]) ?? [];
  if (width <= 0 || height <= 0 || rootData.length === 0) return () => undefined;

  const innerW = Math.max(0, width - PACK_PLOT_PAD * 2);
  const innerH = Math.max(0, height - PACK_PLOT_PAD * 2);
  const strokeWidth = depthLevel === "off" ? 1.5 : 1;
  const childrenMap = new Map<string, PackDatum[]>();
  indexChildren(rootData, childrenMap);
  let drillStack: PackDatum[][] = [rootData];
  let drillLabels: string[] = ["全部"];
  let simulation: PackPhysicsSimulation | null = null;
  let visualFrame: number | null = null;
  let lastFrameMs: number | null = null;
  let hovered: PackPhysicsNode | null = null;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr("data-pixel-no-drag", "true")
    .style("touch-action", "none");

  const plot = svg.append("g").attr("transform", `translate(${PACK_PLOT_PAD},${PACK_PLOT_PAD})`);
  const clipId = `vs-pack-clip-${Math.random().toString(36).slice(2, 9)}`;
  plot.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("width", innerW).attr("height", innerH);
  plot
    .append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "none")
    .attr("stroke", theme.axisLabel)
    .attr("stroke-opacity", 0.55)
    .attr("rx", 4);
  const breadcrumb = plot.append("g").attr("class", "pack-breadcrumb");
  const layer = plot.append("g").attr("clip-path", `url(#${clipId})`);
  const tooltip = showTooltip ? createTooltip(container, theme, config.tooltipPresentation) : null;

  const stopVisualPump = () => {
    if (visualFrame !== null) cancelAnimationFrame(visualFrame);
    visualFrame = null;
    lastFrameMs = null;
  };

  const mountLevel = () => {
    simulation?.stop();
    stopVisualPump();
    hovered = null;
    layer.selectAll("*").remove();
    breadcrumb.selectAll("*").remove();

    const active = drillStack[drillStack.length - 1]!;
    const packed = packLeaves(active, innerW, innerH - 18);
    const rawLayout = packed.map((d) => ({ name: d.data.name, x: d.x, y: d.y + 18, r: d.r, value: d.value ?? 0 }));
    const avgR = rawLayout.length ? rawLayout.reduce((s, d) => s + d.r, 0) / rawLayout.length : 0;
    const layout = fitPackLayoutToPlot(rawLayout, innerW, innerH, resolvePackEdgeInset(avgR, strokeWidth));
    const colorScale = d3.scaleOrdinal<string>().domain(layout.map((d) => d.name)).range(colors);
    const physicsNodes = createPackPhysicsNodes(layout);
    simulation = createPackPhysicsSimulation(physicsNodes, innerW, innerH, strokeWidth);
    simulation.alpha(0);
    simulation.alphaTarget(0);

    let crumbX = 4;
    drillLabels.forEach((label, index) => {
      breadcrumb
        .append("text")
        .attr("x", crumbX)
        .attr("y", 12)
        .attr("fill", index === drillLabels.length - 1 ? theme.legendText : theme.accent)
        .style("font-size", "10px")
        .style("cursor", index < drillLabels.length - 1 ? "pointer" : "default")
        .text(label)
        .on("click", () => {
          if (index < drillLabels.length - 1) {
            drillStack = drillStack.slice(0, index + 1);
            drillLabels = drillLabels.slice(0, index + 1);
            mountLevel();
          }
        });
      crumbX += label.length * 7 + 10;
    });

    const groups = layer
      .selectAll<SVGGElement, PackPhysicsNode>("g.pack-node")
      .data(physicsNodes)
      .join("g")
      .attr("class", "pack-node")
      .attr("transform", (d) => `translate(${d.x ?? d.targetX},${d.y ?? d.targetY})`);

    const labels = showLabel
      ? groups.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "#fff").style("pointer-events", "none").text((d) => d.name)
      : null;

    const updateVisual = () => {
      groups.attr("transform", (d) => `translate(${d.x ?? d.targetX},${d.y ?? d.targetY})`);
      groups.select("circle").attr("r", (d) => packNodeRadius(d));
      if (labels) {
        labels.style("font-size", (d) => `${Math.min(14, Math.max(9, packNodeRadius(d) / 3))}px`);
        labels.text((d) => (packNodeRadius(d) > 18 ? d.name : ""));
      }
    };

    const pumpVisual = (now: number) => {
      const dt = normalizePackDt(lastFrameMs == null ? 16.67 : now - lastFrameMs);
      lastFrameMs = now;
      stepPackMotionFrame(physicsNodes, { width: innerW, height: innerH, strokeWidth, interaction: hovered ? "hover" : "idle", dt });
      updateVisual();
      if (isPackMotionActive(physicsNodes, hovered ? "hover" : "idle")) visualFrame = requestAnimationFrame(pumpVisual);
      else {
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

    const circles = groups
      .append("circle")
      .attr("r", prefersReducedMotion() ? (d) => packNodeRadius(d) : 0)
      .attr("fill", (d) => colorScale(d.name) ?? colors[0] ?? theme.accent)
      .attr("opacity", 0.92)
      .attr("stroke", (d) => packCircleStroke(colorScale(d.name) ?? colors[0] ?? theme.accent, depthLevel))
      .attr("stroke-opacity", 0.92)
      .attr("stroke-width", strokeWidth)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        const kids = childrenMap.get(d.name);
        if (kids?.length) {
          drillStack = [...drillStack, kids];
          drillLabels = [...drillLabels, d.name];
          mountLevel();
          return;
        }
        const packedNode = packed.find((item) => item.data.name === d.name);
        onPointClick?.({ name: d.name, value: packedNode?.value ?? 0 } as D3Datum);
      });

    if (!prefersReducedMotion()) {
      circles
        .transition()
        .delay((_d, i) => i * VCDS.motion.stagger)
        .duration(motionDuration("enter"))
        .attr("r", (d) => packNodeRadius(d));
    }

    layer.on("pointermove", (event: PointerEvent) => {
      const [x, y] = d3.pointer(event);
      const hit = pickPackNodeAt(physicsNodes, x, y);
      if (hit) {
        if (hovered && hovered !== hit) blurPackNode(hovered);
        hovered = hit;
        focusPackNode(hit);
        simulation?.setInteraction("hover");
        ensureVisualPump();
        if (tooltip) {
          const packedNode = packed.find((item) => item.data.name === hit.name);
          tooltip
            .style("opacity", "1")
            .html(`<div style="font-weight:600">${hit.name}</div><div><strong>${formatChartValue(packedNode?.value ?? 0, valueFormat)}</strong></div>`);
          const rect = container.getBoundingClientRect();
          tooltip.style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`).style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
        }
      } else if (hovered) {
        blurPackNode(hovered);
        hovered = null;
        simulation?.setInteraction("idle");
        ensureVisualPump();
        tooltip?.style("opacity", "0");
      }
    }).on("pointerleave", () => {
      if (hovered) blurPackNode(hovered);
      hovered = null;
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
  };

  mountLevel();
  return () => {
    stopVisualPump();
    simulation?.stop();
    container.replaceChildren();
  };
}
