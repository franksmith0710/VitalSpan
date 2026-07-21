import * as d3 from "d3";
import { applyRotatedCategoryLabels, pickCategoryTicks, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3MatrixRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const CELL_RX = 2;

export function renderD3HeatmapChart(container: HTMLElement, config: D3MatrixRenderConfig): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0 || config.data.length === 0) return () => undefined;

  const { width, height, data, colors, theme, showTooltip, valueFormat, onPointClick } = config;

  const xCategories = [...new Set(data.map((d) => d.x))];
  const yCategories = [...new Set(data.map((d) => d.y))];
  const margin = cartesianMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const values = data.map((d) => d.value);
  const maxVal = d3.max(values) ?? 0;
  const minVal = d3.min(values) ?? 0;
  const baseColor = colors[0] ?? "#465fff";
  const colorScale = d3
    .scaleSequential(d3.interpolateRgb("#f2f4f7", baseColor))
    .domain(minVal === maxVal ? [0, maxVal || 1] : [minVal, maxVal]);

  const x = d3.scaleBand<string>().domain(xCategories).range([0, innerW]).padding(0.06);
  const y = d3.scaleBand<string>().domain(yCategories).range([0, innerH]).padding(0.06);
  const xTicks = pickCategoryTicks(xCategories, innerW);
  const rotateX = xTicks.length >= 6 && innerW / xTicks.length < 72 ? -32 : 0;

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const tooltip = showTooltip ? createTooltip(container, theme) : null;

  g.append("g")
    .call(d3.axisLeft(y))
    .call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(xTicks))
    .call(styleAxis, theme)
    .call((sel) => applyRotatedCategoryLabels(sel, rotateX));

  g.selectAll("rect.cell")
    .data(data)
    .join("rect")
    .attr("class", "cell")
    .attr("x", (d) => x(d.x) ?? 0)
    .attr("y", (d) => y(d.y) ?? 0)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", CELL_RX)
    .attr("fill", (d) => colorScale(d.value))
    .attr("stroke", theme.axisLine)
    .attr("stroke-width", 0.4)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .on("mouseenter", function (_event, d) {
      d3.select(this).attr("stroke-width", 1.2);
      if (!tooltip) return;
      tooltip
        .style("opacity", "1")
        .html(
          `<div style="font-weight:600;margin-bottom:2px">${d.x} · ${d.y}</div>` +
            `<div><strong>${formatChartValue(d.value, valueFormat)}</strong></div>`,
        );
    })
    .on("mousemove", (event) => {
      if (!tooltip) return;
      const rect = container.getBoundingClientRect();
      tooltip
        .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
        .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("stroke-width", 0.4);
      tooltip?.style("opacity", "0");
    })
    .on("click", (_event, d) => onPointClick?.(d));

  return () => container.replaceChildren();
}
