import * as d3 from "d3";
import { applyCellBevel, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

type TreemapDatum = { name: string; value: number };
type TreeNode = { name: string; value?: number; children?: TreeNode[] };

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

export function renderD3TreemapChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const {
    width,
    height,
    colors,
    theme,
    showLabel,
    showTooltip,
    valueFormat,
    options,
    onPointClick,
    conditionalRules = [],
    depthVisual,
  } = config;
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const data = (options.data as TreemapDatum[]) ?? [];
  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const root = d3
    .hierarchy<TreeNode>({ name: "root", children: data })
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  d3.treemap<TreeNode>().size([width, height]).paddingInner(2).paddingOuter(4).round(true)(root);

  const leaves = root.leaves() as d3.HierarchyRectangularNode<TreeNode>[];
  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(leaves.map((d) => d.data.name))
    .range(colors);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const tooltip = showTooltip ? createTooltip(container, theme) : null;
  const cells = svg
    .selectAll<SVGGElement, d3.HierarchyRectangularNode<TreeNode>>("g.cell")
    .data(leaves)
    .join("g")
    .attr("class", "cell")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  cells
    .append("rect")
    .attr("width", (d) => Math.max(0, d.x1 - d.x0))
    .attr("height", (d) => Math.max(0, d.y1 - d.y0))
    .attr("rx", 3)
    .attr("fill", (d) => {
      const base = colorScale(d.data.name) ?? colors[0] ?? "#465fff";
      return conditionalRules.length > 0
        ? resolveDatumColor(d.value ?? 0, base, conditionalRules)
        : base;
    })
    .attr("opacity", 0.92)
    .attr("stroke", theme.background === "transparent" ? "#fff" : theme.background)
    .attr("stroke-width", 1.5)
    .style("cursor", onPointClick ? "pointer" : "default")
    .each(function () {
      applyCellBevel(d3.select(this), depthLevel);
    })
    .on("mouseenter", function () {
      d3.select(this).attr("opacity", 1);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("opacity", 0.92);
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      tooltip
        .style("opacity", "1")
        .html(
          `<div style="font-weight:600;margin-bottom:2px">${d.data.name}</div>` +
            `<div><strong>${formatChartValue(d.value ?? 0, valueFormat)}</strong></div>`,
        );
      positionTooltip(tooltip, event, container, width);
    })
    .on("mouseout", () => tooltip?.style("opacity", "0"))
    .on("click", (_event, d) => onPointClick?.({ name: d.data.name, value: d.value ?? 0 } as D3Datum));

  if (showLabel) {
    cells
      .append("text")
      .attr("x", 6)
      .attr("y", 14)
      .attr("fill", "#fff")
      .style("font-size", "11px")
      .style("pointer-events", "none")
      .text((d) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        return w > 36 && h > 18 ? d.data.name : "";
      });
  }

  return () => container.replaceChildren();
}
