import * as d3 from "d3";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";

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

export function renderD3ForceGraph(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const { width, height, colors, theme, showLabel, showTooltip, options, onPointClick } = config;
  const nodesInput = (options.nodes as GraphNodeInput[]) ?? [];
  const edgesInput = (options.edges as GraphEdgeInput[]) ?? [];
  const layout = (options.layout as GraphLayout | undefined) ?? {};
  if (width <= 0 || height <= 0 || nodesInput.length === 0) return () => undefined;

  const simNodes: SimNode[] = nodesInput.map((n) => ({
    id: n.id,
    label: n.data?.label ?? n.id,
  }));
  const nodeById = new Map(simNodes.map((n) => [n.id, n]));
  const simLinks: SimLink[] = edgesInput
    .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
    .map((e) => ({ source: e.source, target: e.target }));

  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(simNodes.map((n) => n.id))
    .range(colors);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const linkLayer = svg.append("g").attr("class", "links");
  const nodeLayer = svg.append("g").attr("class", "nodes");

  const link = linkLayer
    .selectAll<SVGLineElement, SimLink>("line")
    .data(simLinks)
    .join("line")
    .attr("stroke", theme.axisLine)
    .attr("stroke-opacity", 0.75)
    .attr("stroke-width", 1.5);

  const tooltip = showTooltip ? createTooltip(container, theme) : null;
  const node = nodeLayer
    .selectAll<SVGGElement, SimNode>("g.node")
    .data(simNodes)
    .join("g")
    .attr("class", "node")
    .style("cursor", onPointClick ? "pointer" : "default");

  node
    .append("circle")
    .attr("r", 10)
    .attr("fill", (d) => colorScale(d.id) ?? colors[0] ?? "#465fff")
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
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text((d) => d.label);
  }

  const chargeStrength = layout.type === "dagre" ? -120 : -220;
  const simulation = d3
    .forceSimulation(simNodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(72),
    )
    .force("charge", d3.forceManyBody().strength(chargeStrength))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(18));

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
