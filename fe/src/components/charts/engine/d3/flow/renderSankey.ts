import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { radialMargin } from "@/components/charts/engine/d3/core/margin";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
  tooltipHtml,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

type SankeyLink = { source: string; target: string; value: number; index: number };
type LayoutNode = {
  id: string;
  depth: number;
  value: number;
  y: number;
  height: number;
  x: number;
};

type PositionedLink = SankeyLink & {
  strokeW: number;
  sourceY: number;
  targetY: number;
};

function assignDepths(links: SankeyLink[]): Map<string, number> {
  const depths = new Map<string, number>();
  const nodes = new Set(links.flatMap((l) => [l.source, l.target]));
  for (const id of nodes) {
    if (!links.some((l) => l.target === id)) depths.set(id, 0);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const link of links) {
      const next = (depths.get(link.source) ?? 0) + 1;
      const prev = depths.get(link.target) ?? 0;
      if (next > prev) {
        depths.set(link.target, next);
        changed = true;
      }
    }
  }
  return depths;
}

function layoutSankeyNodes(
  links: SankeyLink[],
  innerW: number,
  innerH: number,
  nodeWidth: number,
  nodePadding: number,
): { nodes: LayoutNode[]; positioned: PositionedLink[] } {
  const depths = assignDepths(links);
  const maxDepth = d3.max([...depths.values()]) ?? 0;
  const colW = maxDepth > 0 ? (innerW - nodeWidth) / maxDepth : 0;
  const totals = new Map<string, number>();
  const outTotals = new Map<string, number>();
  const inTotals = new Map<string, number>();
  for (const link of links) {
    totals.set(link.source, (totals.get(link.source) ?? 0) + link.value);
    totals.set(link.target, (totals.get(link.target) ?? 0) + link.value);
    outTotals.set(link.source, (outTotals.get(link.source) ?? 0) + link.value);
    inTotals.set(link.target, (inTotals.get(link.target) ?? 0) + link.value);
  }
  const byDepth = d3.group([...totals.keys()], (id) => depths.get(id) ?? 0);
  const nodes: LayoutNode[] = [];

  for (const [depth, ids] of byDepth.entries()) {
    const sorted = [...ids].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
    const sum = d3.sum(sorted, (id) => totals.get(id) ?? 0) || 1;
    let y = nodePadding;
    for (const id of sorted) {
      const value = totals.get(id) ?? 0;
      const height = Math.max(8, (value / sum) * (innerH - nodePadding * 2));
      nodes.push({ id, depth, value, y, height, x: depth * colW });
      y += height + nodePadding;
    }
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const sourceOffset = new Map<string, number>();
  const targetOffset = new Map<string, number>();
  const positioned: PositionedLink[] = links.map((link) => {
    const s = nodeMap.get(link.source);
    const t = nodeMap.get(link.target);
    const sOut = outTotals.get(link.source) || 1;
    const tIn = inTotals.get(link.target) || 1;
    const strokeW =
      s && t ? Math.max(1, (link.value / Math.max(sOut, tIn)) * Math.min(s.height, t.height)) : 1;
    const sOff = sourceOffset.get(link.source) ?? 0;
    const tOff = targetOffset.get(link.target) ?? 0;
    sourceOffset.set(link.source, sOff + (s ? (link.value / sOut) * s.height : 0));
    targetOffset.set(link.target, tOff + (t ? (link.value / tIn) * t.height : 0));
    return {
      ...link,
      strokeW,
      sourceY: (s?.y ?? 0) + sOff,
      targetY: (t?.y ?? 0) + tOff,
    };
  });

  return { nodes, positioned };
}

function linkPath(
  sx: number,
  sy: number,
  sh: number,
  tx: number,
  ty: number,
  th: number,
  nodeWidth: number,
): string {
  const x0 = sx + nodeWidth;
  const x1 = tx;
  const xm = (x0 + x1) / 2;
  return `M ${x0} ${sy} C ${xm} ${sy}, ${xm} ${ty}, ${x1} ${ty} L ${x1} ${ty + th} C ${xm} ${ty + th}, ${xm} ${sy + sh}, ${x0} ${sy + sh} Z`;
}

function collapsedLinkPath(sx: number, sy: number, tx: number, ty: number, nodeWidth: number): string {
  const x0 = sx + nodeWidth;
  const x1 = tx;
  const xm = (x0 + x1) / 2;
  return `M ${x0} ${sy} C ${xm} ${sy}, ${xm} ${ty}, ${x1} ${ty} L ${x1} ${ty} C ${xm} ${ty}, ${xm} ${sy}, ${x0} ${sy} Z`;
}

function relatedLinkIndices(links: PositionedLink[], origin: PositionedLink): Set<number> {
  const related = new Set<number>([origin.index]);
  const upstream = new Set<string>([origin.source]);
  const downstream = new Set<string>([origin.target]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const link of links) {
      if (upstream.has(link.target) && !upstream.has(link.source)) {
        upstream.add(link.source);
        related.add(link.index);
        changed = true;
      }
      if (downstream.has(link.source) && !downstream.has(link.target)) {
        downstream.add(link.target);
        related.add(link.index);
        changed = true;
      }
    }
  }
  return related;
}

export function renderD3SankeyChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const { width, height, colors, theme, showTooltip, valueFormat, options, onPointClick, depthVisual } = config;
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const defaultLinkOpacity = depthLevel === "enhanced" ? 0.38 : depthLevel === "standard" ? 0.32 : VCDS.sankey.linkOpacity;
  const sourceField = String(options.sourceField ?? "source");
  const targetField = String(options.targetField ?? "target");
  const weightField = String(options.weightField ?? "value");
  const raw = (options.data as D3Datum[]) ?? [];
  const links: SankeyLink[] = raw.map((row, index) => ({
    source: String(row[sourceField] ?? ""),
    target: String(row[targetField] ?? ""),
    value: Math.max(0, Number(row[weightField] ?? 0)),
    index,
  }));

  if (width <= 0 || height <= 0 || links.length === 0) return () => undefined;

  const margin = radialMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const nodeWidth = Number(options.__sankeyNodeWidth ?? VCDS.sankey.nodeWidth);
  const nodePadding = Number(options.__sankeyNodeGap ?? VCDS.sankey.nodePadding);
  const linkOpacity = Number(options.__sankeyLinkOpacity ?? defaultLinkOpacity);
  const { nodes, positioned } = layoutSankeyNodes(links, innerW, innerH, nodeWidth, nodePadding);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const colorScale = d3.scaleOrdinal<string>().domain(nodes.map((n) => n.id)).range(colors);

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const tooltip = showTooltip ? createTooltipLayer(container, theme, config.tooltipPresentation) : null;

  const resetLinkOpacity = () => {
    g.selectAll<SVGPathElement, PositionedLink>("path.sankey-link").attr("opacity", linkOpacity);
  };

  const highlightLinks = (link: PositionedLink) => {
    const related = relatedLinkIndices(positioned, link);
    g.selectAll<SVGPathElement, PositionedLink>("path.sankey-link").attr("opacity", (d) =>
      related.has(d.index) ? VCDS.sankey.highlightOpacity : linkOpacity * 0.35,
    );
  };

  g
    .selectAll<SVGPathElement, PositionedLink>("path.sankey-link")
    .data(positioned)
    .join("path")
    .attr("class", "sankey-link")
    .attr("fill", (d) => colorScale(d.source) ?? colors[0] ?? theme.accent)
    .attr("opacity", linkOpacity)
    .style("cursor", onPointClick ? "pointer" : "default")
    .each(function (link) {
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (!s || !t) return;
      const strokeW = link.strokeW;
      const finalD = linkPath(s.x, link.sourceY, strokeW, t.x, link.targetY, strokeW, nodeWidth);
      const path = d3.select(this);
      if (!prefersReducedMotion()) {
        path
          .attr("d", collapsedLinkPath(s.x, link.sourceY, t.x, link.targetY, nodeWidth))
          .transition()
          .duration(motionDuration("enter"))
          .delay(link.index * VCDS.motion.stagger)
          .attr("d", finalD);
      } else {
        path.attr("d", finalD);
      }
    })
    .on("mouseenter", function (event, link) {
      highlightLinks(link);
      if (!tooltip) return;
      showSimpleTooltip(
        tooltip,
        container,
        event,
        tooltipHtml(`${link.source} → ${link.target}`, [
          { name: "", color: colorScale(link.source) ?? colors[0] ?? theme.accent, value: link.value },
        ], valueFormat),
        width,
      );
    })
    .on("mousemove", (event, link) => {
      if (!tooltip) return;
      showSimpleTooltip(
        tooltip,
        container,
        event,
        tooltipHtml(`${link.source} → ${link.target}`, [
          { name: "", color: colorScale(link.source) ?? colors[0] ?? theme.accent, value: link.value },
        ], valueFormat),
        width,
      );
    })
    .on("mouseleave", () => {
      resetLinkOpacity();
      hideTooltip(tooltip);
    })
    .on("click", (_event, link) =>
      onPointClick?.({
        [sourceField]: link.source,
        [targetField]: link.target,
        [weightField]: link.value,
      }),
    );

  g.selectAll<SVGRectElement, LayoutNode>("rect.node")
    .data(nodes)
    .join("rect")
    .attr("class", "node")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("width", nodeWidth)
    .attr("height", (d) => d.height)
    .attr("rx", 3)
    .attr("fill", (d) => colorScale(d.id) ?? colors[0] ?? theme.accent)
    .attr("opacity", 0.92)
    .style("cursor", onPointClick ? "pointer" : "default")
    .on("mouseenter", function (event, node) {
      const related = new Set(
        positioned.filter((l) => l.source === node.id || l.target === node.id).map((l) => l.index),
      );
      g.selectAll<SVGPathElement, PositionedLink>("path.sankey-link").attr("opacity", (d) =>
        related.has(d.index) ? VCDS.sankey.highlightOpacity : linkOpacity * 0.35,
      );
      if (!tooltip) return;
      showSimpleTooltip(
        tooltip,
        container,
        event,
        `<div style="font-weight:600">${node.id}</div><div style="margin-top:4px">${formatChartValue(node.value, valueFormat)}</div>`,
        width,
      );
    })
    .on("mousemove", (event, node) => {
      if (!tooltip) return;
      showSimpleTooltip(
        tooltip,
        container,
        event,
        `<div style="font-weight:600">${node.id}</div><div style="margin-top:4px">${formatChartValue(node.value, valueFormat)}</div>`,
        width,
      );
    })
    .on("mouseleave", () => {
      resetLinkOpacity();
      hideTooltip(tooltip);
    })
    .on("click", (_event, node) => onPointClick?.({ id: node.id, value: node.value }));

  g.selectAll<SVGTextElement, LayoutNode>("text.node-label")
    .data(nodes)
    .join("text")
    .attr("class", "node-label")
    .attr("x", (d) => d.x + (d.depth === 0 ? -6 : nodeWidth + 6))
    .attr("y", (d) => d.y + d.height / 2)
    .attr("text-anchor", (d) => (d.depth === 0 ? "end" : "start"))
    .attr("dy", "0.35em")
    .attr("fill", theme.axisLabel)
    .style("font-size", "11px")
    .style("pointer-events", "none")
    .text((d) => d.id);

  return () => container.replaceChildren();
}
