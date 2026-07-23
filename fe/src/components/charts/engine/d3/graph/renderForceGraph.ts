import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { createTooltipLayer, hideTooltip, showSimpleTooltip } from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";

type GraphNodeInput = { id: string; data?: { label?: string } };
type GraphEdgeInput = { source: string; target: string };
type GraphLayout = { type?: string };

type SimNode = d3.SimulationNodeDatum & { id: string; label: string };
type SimLink = d3.SimulationLinkDatum<SimNode> & { index?: number };

function neighborIds(nodeId: string, links: SimLink[]): Set<string> {
  const set = new Set<string>([nodeId]);
  for (const link of links) {
    const s = (link.source as SimNode).id ?? String(link.source);
    const t = (link.target as SimNode).id ?? String(link.target);
    if (s === nodeId) set.add(t);
    if (t === nodeId) set.add(s);
  }
  return set;
}

export function renderD3ForceGraph(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const { width, height, colors, theme, showLabel, showTooltip, options, onPointClick, depthVisual } = config;
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const nodesInput = (options.nodes as GraphNodeInput[]) ?? [];
  const edgesInput = (options.edges as GraphEdgeInput[]) ?? [];
  const layout = (options.layout as GraphLayout | undefined) ?? {};
  const styleLayout = String(options.__graphLayout ?? "");
  if (width <= 0 || height <= 0 || nodesInput.length === 0) return () => undefined;

  const simNodes: SimNode[] = nodesInput.map((n) => ({
    id: n.id,
    label: n.data?.label ?? n.id,
  }));
  const nodeById = new Map(simNodes.map((n) => [n.id, n]));
  const simLinks: SimLink[] = edgesInput
    .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
    .map((e, index) => ({ source: e.source, target: e.target, index }));

  const colorScale = d3.scaleOrdinal<string>().domain(simNodes.map((n) => n.id)).range(colors);
  const nodeRadius = VCDS.graph.nodeRadius;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr("data-pixel-no-drag", "true");

  const zoomLayer = svg.append("g");
  const linkLayer = zoomLayer.append("g").attr("class", "links");
  const nodeLayer = zoomLayer.append("g").attr("class", "nodes");
  const defs = depthLevel !== "off" ? svg.append("defs") : null;

  const nodeFill = (id: string): string => {
    const color = colorScale(id) ?? colors[0] ?? theme.accent;
    if (!defs || depthLevel === "off") return color;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const gradId = `vs-force-node-${safeId}`;
    if (defs.select(`#${gradId}`).empty()) {
      const grad = defs.append("radialGradient").attr("id", gradId).attr("cx", "35%").attr("cy", "35%").attr("r", "70%");
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

  const tooltip = showTooltip ? createTooltipLayer(container, theme, config.tooltipPresentation) : null;
  const node = nodeLayer
    .selectAll<SVGGElement, SimNode>("g.node")
    .data(simNodes)
    .join("g")
    .attr("class", "node")
    .style("cursor", onPointClick ? "pointer" : "grab");

  const resetHighlight = () => {
    node.attr("opacity", 1);
    link.attr("stroke-opacity", 0.75);
  };

  const highlightNeighbors = (nodeId: string) => {
    const related = neighborIds(nodeId, simLinks);
    node.attr("opacity", (d) => (related.has(d.id) ? 1 : VCDS.graph.dimOpacity));
    link.attr("stroke-opacity", (d) => {
      const s = (d.source as SimNode).id;
      const t = (d.target as SimNode).id;
      return related.has(s) && related.has(t) ? 0.85 : VCDS.graph.dimOpacity;
    });
  };

  node
    .append("circle")
    .attr("r", nodeRadius)
    .attr("fill", (d) => nodeFill(d.id))
    .attr("stroke", theme.background === "transparent" ? "#fff" : theme.background)
    .attr("stroke-width", 2)
    .on("mouseenter", function (_event, d) {
      d3.select(this).attr("r", nodeRadius + 2);
      highlightNeighbors(d.id);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", nodeRadius);
      resetHighlight();
      hideTooltip(tooltip);
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      showSimpleTooltip(tooltip, container, event, `<div style="font-weight:600">${d.label}</div>`, width);
    })
    .on("click", (_event, d) => onPointClick?.({ id: d.id, label: d.label } as D3Datum));

  link
    .on("mouseenter", function (event, d) {
      const s = (d.source as SimNode).id ?? String(d.source);
      const t = (d.target as SimNode).id ?? String(d.target);
      highlightNeighbors(s);
      if (!tooltip) return;
      showSimpleTooltip(tooltip, container, event, `<div style="font-weight:600">${s} → ${t}</div>`, width);
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      const s = (d.source as SimNode).id ?? String(d.source);
      const t = (d.target as SimNode).id ?? String(d.target);
      showSimpleTooltip(tooltip, container, event, `<div style="font-weight:600">${s} → ${t}</div>`, width);
    })
    .on("mouseleave", () => {
      resetHighlight();
      hideTooltip(tooltip);
    });

  if (showLabel) {
    node
      .append("text")
      .attr("dy", nodeRadius + 12)
      .attr("text-anchor", "middle")
      .attr("fill", theme.axisLabel)
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text((d) => d.label);
  }

  const layoutType = styleLayout || layout.type || "force";
  const repulsion = Number.isFinite(Number(options.__graphRepulsion))
    ? Math.abs(Number(options.__graphRepulsion))
    : layoutType === "dagre"
      ? 120
      : Math.abs(VCDS.graph.chargeStrength);
  const edgeLength = Number.isFinite(Number(options.__graphEdgeLength))
    ? Math.abs(Number(options.__graphEdgeLength))
    : layoutType === "dagre"
      ? 56
      : VCDS.graph.linkDistance;

  const simulation = d3
    .forceSimulation(simNodes)
    .force("link", d3.forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(edgeLength))
    .force("charge", d3.forceManyBody().strength(-repulsion))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(nodeRadius + 8));

  const drag = d3
    .drag<SVGGElement, SimNode>()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
  node.call(drag);

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.4, 4])
    .on("zoom", (event) => {
      zoomLayer.attr("transform", event.transform.toString());
    });
  svg.call(zoom);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => (d.source as SimNode).x ?? 0)
      .attr("y1", (d) => (d.source as SimNode).y ?? 0)
      .attr("x2", (d) => (d.target as SimNode).x ?? 0)
      .attr("y2", (d) => (d.target as SimNode).y ?? 0);
    node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
  });

  return () => {
    simulation.stop();
    container.replaceChildren();
  };
}
