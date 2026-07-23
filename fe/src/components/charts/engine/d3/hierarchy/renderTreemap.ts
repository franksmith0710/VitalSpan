import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { applyCellBevel, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { staggerEnterSelection } from "@/components/charts/engine/d3/core/motionEngine";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

type TreemapDatum = { name: string; value?: number; children?: TreemapDatum[] };
type TreeNode = TreemapDatum;

function adaptiveTextFill(fill: string): string {
  const c = d3.color(fill);
  if (!c) return "#fff";
  const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  return lum > 150 ? "#0f172a" : "#fff";
}

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

function normalizeRoot(data: TreemapDatum[]): TreeNode {
  if (data.length === 1 && data[0]?.children?.length) return data[0]!;
  return { name: "root", children: data };
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
  const rawData = (options.data as TreemapDatum[]) ?? [];
  if (width <= 0 || height <= 0 || rawData.length === 0) return () => undefined;

  const fullRoot = normalizeRoot(rawData);
  let drillStack: TreeNode[] = [fullRoot];

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const breadcrumb = svg.append("g").attr("class", "treemap-breadcrumb");
  const layer = svg.append("g").attr("class", "treemap-layer");
  const tooltip = showTooltip ? createTooltip(container, theme, config.tooltipPresentation) : null;

  const renderLevel = () => {
    const current = drillStack[drillStack.length - 1]!;
    layer.selectAll("*").remove();

    const root = d3
      .hierarchy<TreeNode>(current)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    d3.treemap<TreeNode>().size([width, height - 22]).paddingInner(2).paddingOuter(4).round(true)(root);
    const leaves = root.leaves() as d3.HierarchyRectangularNode<TreeNode>[];
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(leaves.map((d) => d.data.name))
      .range(colors);

    breadcrumb.selectAll("*").remove();
    let crumbX = 8;
    drillStack.forEach((node, index) => {
      if (index > 0) {
        breadcrumb
          .append("text")
          .attr("x", crumbX)
          .attr("y", 14)
          .attr("fill", theme.axisLabel)
          .style("font-size", "11px")
          .text(" / ");
        crumbX += 12;
      }
      breadcrumb
        .append("text")
        .attr("x", crumbX)
        .attr("y", 14)
        .attr("fill", index === drillStack.length - 1 ? theme.legendText : theme.accent)
        .style("font-size", "11px")
        .style("cursor", index < drillStack.length - 1 ? "pointer" : "default")
        .text(node.name === "root" ? "全部" : node.name)
        .on("click", () => {
          if (index < drillStack.length - 1) {
            drillStack = drillStack.slice(0, index + 1);
            renderLevel();
          }
        });
      crumbX += (node.name === "root" ? 2 : node.name.length) * 7 + 8;
    });

    const cells = layer
      .selectAll<SVGGElement, d3.HierarchyRectangularNode<TreeNode>>("g.cell")
      .data(leaves)
      .join("g")
      .attr("class", "cell")
      .attr("transform", (d) => `translate(${d.x0},${d.y0 + 22})`);

    const rects = cells
      .append("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("rx", 3)
      .attr("fill", (d) => {
        const base = colorScale(d.data.name) ?? colors[0] ?? theme.accent;
        return conditionalRules.length > 0
          ? resolveDatumColor(d.value ?? 0, base, conditionalRules)
          : base;
      })
      .attr("opacity", 0.92)
      .attr("stroke", theme.background === "transparent" ? "#fff" : theme.background)
      .attr("stroke-width", 1.5)
      .style("cursor", onPointClick ? "pointer" : "default")
      .each(function (d) {
        applyCellBevel(d3.select(this), depthLevel);
        if (!prefersReducedMotion()) staggerEnterSelection(d3.select(this));
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
      .on("click", (_event, d) => onPointClick?.({ name: d.data.name, value: d.value ?? 0 } as D3Datum))
      .on("dblclick", (event, d) => {
        event.stopPropagation();
        if (d.data.children?.length) {
          drillStack = [...drillStack, d.data];
          renderLevel();
        }
      });

    if (showLabel) {
      cells
        .append("text")
        .attr("x", 6)
        .attr("y", 14)
        .attr("fill", (d) => adaptiveTextFill(colorScale(d.data.name) ?? colors[0] ?? theme.accent))
        .style("font-size", "11px")
        .style("pointer-events", "none")
        .text((d) => {
          const w = d.x1 - d.x0;
          const h = d.y1 - d.y0;
          return w > 36 && h > 18 ? d.data.name : "";
        });
    }

    void rects;
  };

  renderLevel();
  return () => container.replaceChildren();
}
