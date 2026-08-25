import * as d3 from "d3";
import { resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import {
  readForceGraphLayoutState,
  writeForceGraphLayoutState,
} from "@/components/charts/engine/d3/graph/forceGraphLayoutState";
import { VIZ_WHEEL_ZOOM_SURFACE_ATTR } from "@/components/dashboard/pixelCanvas/pixelCanvasWheelScroll";

type GraphNodeInput = { id: string; data?: { label?: string } };
type GraphEdgeInput = { source: string; target: string };
type GraphLayout = { type?: string };

type SimNode = d3.SimulationNodeDatum & { id: string; label: string };
type SimLink = d3.SimulationLinkDatum<SimNode>;

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

function seedNodesInRing(nodes: SimNode[], width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1) - Math.PI / 2;
    node.x = cx + radius * Math.cos(angle);
    node.y = cy + radius * Math.sin(angle);
  });
}

function resolveRepulsion(
  span: number,
  nodeCount: number,
  layoutType: string,
  override: unknown,
): number {
  if (Number.isFinite(Number(override))) {
    return Math.max(80, Math.abs(Number(override)));
  }
  const base =
    layoutType === "dagre"
      ? span < 280
        ? 120
        : 180
      : span < 280
        ? 160
        : span < 420
          ? 220
          : 280;
  return Math.max(base, Math.min(520, base * Math.sqrt(nodeCount / 6)));
}

function dedupeLinks(links: SimLink[]): SimLink[] {
  const seen = new Set<string>();
  const next: SimLink[] = [];
  for (const link of links) {
    const source = typeof link.source === "string" ? link.source : link.source.id;
    const target = typeof link.target === "string" ? link.target : link.target.id;
    const key = `${source}\0${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ source, target });
  }
  return next;
}

function lockNodePositions(nodes: SimNode[]): void {
  for (const node of nodes) {
    if (node.x == null || node.y == null) continue;
    node.fx = node.x;
    node.fy = node.y;
  }
}

function applySavedLayout(nodes: SimNode[], saved: Record<string, { x: number; y: number; fx: number; fy: number }>): boolean {
  let restored = 0;
  for (const node of nodes) {
    const pos = saved[node.id];
    if (!pos) continue;
    node.x = pos.x;
    node.y = pos.y;
    node.fx = pos.fx;
    node.fy = pos.fy;
    restored += 1;
  }
  return restored === nodes.length;
}

export function renderD3ForceGraph(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const {
    width,
    height,
    colors,
    theme,
    showLabel,
    showTooltip,
    options,
    onPointClick,
    depthVisual,
    labelFontSize,
    instanceKey,
  } = config;
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const nodesInput = (options.nodes as GraphNodeInput[]) ?? [];
  const edgesInput = (options.edges as GraphEdgeInput[]) ?? [];
  const layout = (options.layout as GraphLayout | undefined) ?? {};
  const styleLayout = String(options.__graphLayout ?? "");
  if (width <= 0 || height <= 0 || nodesInput.length === 0) return () => undefined;

  container.setAttribute(VIZ_WHEEL_ZOOM_SURFACE_ATTR, "true");

  const simNodes: SimNode[] = nodesInput.map((n) => ({
    id: n.id,
    label: n.data?.label ?? n.id,
  }));
  const nodeById = new Map(simNodes.map((n) => [n.id, n]));
  const simLinks: SimLink[] = dedupeLinks(
    edgesInput
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
      .map((e) => ({ source: e.source, target: e.target })),
  );

  const savedLayout = readForceGraphLayoutState(instanceKey);
  const restoredLayout = savedLayout ? applySavedLayout(simNodes, savedLayout) : false;
  if (!restoredLayout) {
    seedNodesInRing(simNodes, width, height);
  }

  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(simNodes.map((n) => n.id))
    .range(colors);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .style("cursor", "grab");

  const zoomRoot = svg.append("g").attr("class", "graph-zoom-root");
  const linkLayer = zoomRoot.append("g").attr("class", "links");
  const nodeLayer = zoomRoot.append("g").attr("class", "nodes");
  const defs = depthLevel !== "off" ? zoomRoot.append("defs") : null;

  const nodeFill = (id: string): string => {
    const color = colorScale(id) ?? colors[0] ?? "#465fff";
    if (!defs || depthLevel === "off") return color;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const gradId = `vs-force-node-${safeId}`;
    if (defs.select(`#${gradId}`).empty()) {
      const grad = defs
        .append("radialGradient")
        .attr("id", gradId)
        .attr("cx", "35%")
        .attr("cy", "35%")
        .attr("r", "70%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", shadeColor(color, "top"));
      grad.append("stop").attr("offset", "100%").attr("stop-color", color);
    }
    return `url(#${gradId})`;
  };

  const link = linkLayer
    .selectAll<SVGLineElement, SimLink>("line")
    .data(simLinks)
    .join("line")
    .attr("stroke", theme.axisLine)
    .attr("stroke-opacity", 0.75)
    .attr("stroke-width", 1.5);

  const tooltip = showTooltip ? createTooltip(container, theme, config.tooltipPresentation) : null;
  const node = nodeLayer
    .selectAll<SVGGElement, SimNode>("g.node")
    .data(simNodes)
    .join("g")
    .attr("class", "node")
    .style("cursor", onPointClick ? "pointer" : "grab");

  node
    .append("circle")
    .attr("r", 10)
    .attr("fill", (d) => nodeFill(d.id))
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .on("mouseenter", function () {
      d3.select(this).attr("r", 12);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 10);
      tooltip?.style("opacity", "0");
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      tooltip
        .style("opacity", "1")
        .html(`<div style="font-weight:600">${d.label}</div>`);
      positionTooltip(tooltip, event, container, width);
    })
    .on("click", (_event, d) => onPointClick?.({ id: d.id, label: d.label } as D3Datum));

  if (showLabel) {
    node
      .append("text")
      .attr("dy", 22)
      .attr("text-anchor", "middle")
      .attr("fill", theme.axisLabel)
      .style("font-size", `${labelFontSize}px`)
      .style("pointer-events", "none")
      .text((d) => d.label);
  }

  const layoutType = styleLayout || layout.type || "force";
  const span = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const repulsion = resolveRepulsion(span, simNodes.length, layoutType, options.__graphRepulsion);
  const edgeLength = Number.isFinite(Number(options.__graphEdgeLength))
    ? Math.abs(Number(options.__graphEdgeLength))
    : layoutType === "dagre"
      ? 56
      : Math.max(48, Math.min(120, span * 0.18));
  const collideRadius = showLabel ? 22 : 16;

  const simulation = d3
    .forceSimulation(simNodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(edgeLength)
        .strength(0.85),
    )
    .force("charge", d3.forceManyBody().strength(-repulsion).distanceMax(span * 1.6))
    .force("center", d3.forceCenter(cx, cy).strength(0.08))
    .force("collide", d3.forceCollide(collideRadius).strength(0.9).iterations(2))
    .alpha(restoredLayout ? 0.02 : 0.85)
    .alphaDecay(0.06)
    .velocityDecay(0.52)
    .alphaMin(0.002);

  const persistLayout = () => {
    writeForceGraphLayoutState(instanceKey, simNodes);
  };

  const freezeLayout = () => {
    lockNodePositions(simNodes);
    simulation.stop();
    persistLayout();
  };

  const runUntilSettled = (maxTicks = 420) => {
    for (let i = 0; i < maxTicks && simulation.alpha() > simulation.alphaMin(); i += 1) {
      simulation.tick();
    }
    freezeLayout();
  };

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => (d.source as SimNode).x ?? 0)
      .attr("y1", (d) => (d.source as SimNode).y ?? 0)
      .attr("x2", (d) => (d.target as SimNode).x ?? 0)
      .attr("y2", (d) => (d.target as SimNode).y ?? 0);
    node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
  });

  simulation.on("end", freezeLayout);

  if (restoredLayout) {
    runUntilSettled(120);
  } else {
    runUntilSettled();
  }

  link
      .attr("x1", (d) => (d.source as SimNode).x ?? 0)
      .attr("y1", (d) => (d.source as SimNode).y ?? 0)
      .attr("x2", (d) => (d.target as SimNode).x ?? 0)
      .attr("y2", (d) => (d.target as SimNode).y ?? 0);
  node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);

  const dragBehavior = d3
    .drag<SVGGElement, SimNode>()
    .on("start", (event, d) => {
      event.sourceEvent.stopPropagation();
      if (!event.active) simulation.alpha(0.12).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      if (d.x != null && d.y != null) {
        d.fx = d.x;
        d.fy = d.y;
      }
      freezeLayout();
    });
  node.call(dragBehavior);

  const zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.35, 4])
    .filter((event) => {
      if (event.type === "wheel") return true;
      const target = event.target as Element | null;
      if (!target) return false;
      return target === svg.node() || target.tagName === "line";
    })
    .on("zoom", (event) => {
      zoomRoot.attr("transform", event.transform);
    });

  svg.call(zoomBehavior).on("dblclick.zoom", null);
  svg.on("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    svg.transition().duration(250).call(zoomBehavior.transform, d3.zoomIdentity);
  });
  svg.on("wheel", (event) => {
    event.stopPropagation();
  });

  return () => {
    persistLayout();
    simulation.stop();
    svg.on(".zoom", null);
    svg.on("dblclick", null);
    svg.on("wheel", null);
    container.removeAttribute(VIZ_WHEEL_ZOOM_SURFACE_ATTR);
    container.replaceChildren();
  };
}
