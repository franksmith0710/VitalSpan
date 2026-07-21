import * as d3 from "d3";
import { applyRotatedCategoryLabels, pickCategoryTicks, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { animateStrokePath } from "@/components/charts/engine/d3/core/animate";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { normalizeCartesianData } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import { drawHorizontalMarkLines } from "@/components/charts/engine/d3/core/markLines";
import { attachCartesianDataZoom } from "@/components/charts/engine/d3/core/dataZoom";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import {
  columnTooltipRows,
  renderDualAxesColumnBars,
  resolveDualAxesColumnMax,
} from "@/components/charts/engine/d3/cartesian/renderDualAxesColumn";
import type { D3CartesianDatum, D3DualAxesRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

function normalizeDataset(
  data: D3CartesianDatum[],
  xField: string,
  yField: string,
): { categories: string[]; points: D3CartesianDatum[] } {
  const normalized = normalizeCartesianData(data, xField, yField);
  const categories = [...new Set(normalized.map((d) => String(d.__category__ ?? "")))];
  return { categories, points: normalized };
}

export function renderD3DualAxesChart(container: HTMLElement, config: D3DualAxesRenderConfig): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0) return () => undefined;

  const {
    width,
    height,
    data: [lineData, columnData],
    xField,
    yField: [lineYField, columnYField],
    geometryOptions,
    columnSeriesField,
    colors,
    theme,
    showTooltip,
    showLegend = true,
    showLabel = false,
    labelFontSize = 12,
    labelColor,
    seriesGradient = false,
    tooltipPresentation,
    valueFormat,
    markLines = [],
    conditionalRules,
    dataZoom = false,
    onPointClick,
  } = config;
  const lineLabels = config.lineLabels;
  const dualLine = geometryOptions[0].geometry === "line" && geometryOptions[1].geometry === "line";

  const lineSet = normalizeDataset(lineData, xField, lineYField);
  const columnSet = normalizeDataset(columnData, xField, columnYField);
  const categories = [...new Set([...lineSet.categories, ...columnSet.categories])];
  if (categories.length === 0) return () => undefined;

  const lineSmooth = geometryOptions[0].geometry === "line" && geometryOptions[0].smooth;
  const columnOpts = geometryOptions[1].geometry === "column" ? geometryOptions[1] : { geometry: "column" as const };

  const margin = { ...cartesianMargin(showLegend), right: 56 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const x = d3.scalePoint<string>().domain(categories).range([0, innerW]).padding(0.5);
  const lineMax = d3.max(lineSet.points, (d) => Number(d.__value__)) ?? 0;
  const columnMax = dualLine
    ? (d3.max(columnSet.points, (d) => Number(d.__value__)) ?? 0)
    : resolveDualAxesColumnMax(columnData, xField, columnYField, columnSeriesField, columnOpts);
  const yLeft = d3.scaleLinear().domain([0, lineMax]).nice().range([innerH, 0]);
  const yRight = d3.scaleLinear().domain([0, columnMax]).nice().range([innerH, 0]);
  const lineColor = colors[0] ?? "#465fff";
  const columnColor = colors[1] ?? "#12b76a";
  const xTicks = pickCategoryTicks(categories, innerW);
  const rotateX = xTicks.length >= 6 && innerW / xTicks.length < 72 ? -32 : 0;
  const curve = lineSmooth ? d3.curveMonotoneX : d3.curveLinear;

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const defs = root.append("defs");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  drawHorizontalMarkLines(plot, markLines, yLeft, innerW);
  const tooltip = showTooltip ? createTooltip(container, theme, tooltipPresentation) : null;

  g.append("g")
    .call(d3.axisLeft(yLeft).ticks(5).tickFormat((d) => formatChartValue(d, valueFormat)))
    .call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(${innerW},0)`)
    .call(d3.axisRight(yRight).ticks(5).tickFormat((d) => formatChartValue(d, valueFormat)))
    .call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(xTicks))
    .call(styleAxis, theme)
    .call((sel) => applyRotatedCategoryLabels(sel, rotateX));

  const linePoints = [...lineSet.points].sort(
    (a, b) => categories.indexOf(String(a.__category__)) - categories.indexOf(String(b.__category__)),
  );
  const lineGen = d3
    .line<D3CartesianDatum>()
    .x((d) => x(String(d.__category__)) ?? 0)
    .y((d) => yLeft(Number(d.__value__)))
    .curve(curve);
  const linePath = plot
    .append("path")
    .datum(linePoints)
    .attr("fill", "none")
    .attr("stroke", lineColor)
    .attr("stroke-width", 2.5)
    .attr("stroke-linecap", "round")
    .attr("d", lineGen);
  animateStrokePath(linePath);

  let columnLegendItems: Array<{ label: string; color: string; w: number; h: number }> = [];

  if (dualLine) {
    const linePoints2 = [...columnSet.points].sort(
      (a, b) => categories.indexOf(String(a.__category__)) - categories.indexOf(String(b.__category__)),
    );
    const lineGen2 = d3
      .line<D3CartesianDatum>()
      .x((d) => x(String(d.__category__)) ?? 0)
      .y((d) => yRight(Number(d.__value__)))
      .curve(curve);
    const linePath2 = plot
      .append("path")
      .datum(linePoints2)
      .attr("fill", "none")
      .attr("stroke", columnColor)
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr("d", lineGen2);
    animateStrokePath(linePath2);

    plot
      .selectAll("circle.dual-line-dot-2")
      .data(linePoints2)
      .join("circle")
      .attr("class", "dual-line-dot-2")
      .attr("r", 3)
      .attr("fill", columnColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("cx", (d) => x(String(d.__category__)) ?? 0)
      .attr("cy", (d) => yRight(Number(d.__value__)))
      .attr("cursor", onPointClick ? "pointer" : "default")
      .on("click", (_event, d) => onPointClick?.(d));
  } else {
    const columnResult = renderDualAxesColumnBars({
      plot,
      defs,
      columnData,
      xField,
      columnYField,
      columnSeriesField,
      categories,
      x,
      yRight,
      innerH,
      innerW,
      columnOpts,
      colors,
      fallbackColor: columnColor,
      theme,
      seriesGradient,
      conditionalRules,
      onPointClick,
    });
    columnLegendItems = columnResult.legendItems;
  }

  plot
    .selectAll("circle.dual-line-dot")
    .data(linePoints)
    .join("circle")
    .attr("class", "dual-line-dot")
    .attr("r", 3)
    .attr("fill", lineColor)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("cx", (d) => x(String(d.__category__)) ?? 0)
    .attr("cy", (d) => yLeft(Number(d.__value__)))
    .attr("cursor", onPointClick ? "pointer" : "default")
    .on("click", (_event, d) => onPointClick?.(d));

  if (showLabel) {
    plot
      .selectAll("text.dual-line-label")
      .data(linePoints)
      .join("text")
      .attr("class", "dual-line-label")
      .attr("x", (d) => x(String(d.__category__)) ?? 0)
      .attr("y", (d) => yLeft(Number(d.__value__)) - 8)
      .attr("text-anchor", "middle")
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.__value__, valueFormat));

    if (!dualLine) {
      const colPoints = normalizeCartesianData(columnData, xField, columnYField, columnSeriesField);
      plot
        .selectAll("text.dual-col-label")
        .data(colPoints)
        .join("text")
        .attr("class", "dual-col-label")
        .attr("x", (d) => x(String(d.__category__)) ?? 0)
        .attr("y", (d) => yRight(Number(d.__value__)) - 4)
        .attr("text-anchor", "middle")
        .attr("fill", resolveLabelFill(theme, labelColor))
        .style("font-size", `${labelFontSize}px`)
        .text((d) => formatChartValue(d.__value__, valueFormat));
    }
  }

  if (showTooltip) {
    plot
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .lower()
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        let best = categories[0] ?? "";
        let bestDist = Infinity;
        for (const cat of categories) {
          const px = x(cat) ?? 0;
          const dist = Math.abs(px - mx);
          if (dist < bestDist) {
            bestDist = dist;
            best = cat;
          }
        }
        const linePt = lineSet.points.find((p) => String(p.__category__) === best);
        const lineName = lineLabels?.[0] ?? "线";
        const colName = lineLabels?.[1] ?? (dualLine ? "线2" : "柱");
        const rows = dualLine
          ? [
              { name: lineName, color: lineColor, value: linePt?.__value__ ?? 0 },
              {
                name: colName,
                color: columnColor,
                value: columnSet.points.find((p) => String(p.__category__) === best)?.__value__ ?? 0,
              },
            ]
          : [
              { name: lineName, color: lineColor, value: linePt?.__value__ ?? 0 },
              ...columnTooltipRows(
                columnData,
                xField,
                columnYField,
                columnSeriesField,
                best,
                colors,
                columnColor,
              ).map((r) => ({ ...r, name: r.name === "柱" ? colName : r.name })),
            ];
        tooltip
          ?.style("opacity", "1")
          .html(tooltipHtml(best, rows, valueFormat));
        const rect = container.getBoundingClientRect();
        tooltip
          ?.style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
          .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
      })
      .on("mouseleave", () => tooltip?.style("opacity", "0"));
  }

  if (showLegend) {
    const legend = root.append("g").attr("transform", `translate(${margin.left},10)`);
    const lineName = lineLabels?.[0] ?? "线";
    const colName = lineLabels?.[1] ?? (dualLine ? "线2" : "柱");
    const items: Array<{ label: string; color: string; w: number; h: number }> = [
      { label: lineName, color: lineColor, w: 14, h: 3 },
    ];
    if (dualLine) {
      items.push({ label: colName, color: columnColor, w: 14, h: 3 });
    } else if (columnLegendItems.length > 1 && columnLegendItems[0]?.label) {
      for (const item of columnLegendItems) {
        items.push({ label: item.label, color: item.color, w: 10, h: 10 });
      }
    } else {
      items.push({ label: colName, color: columnColor, w: 10, h: 10 });
    }
    let offsetX = 0;
    for (const item of items) {
      const gItem = legend.append("g").attr("transform", `translate(${offsetX},0)`);
      gItem
        .append("rect")
        .attr("width", item.w)
        .attr("height", item.h)
        .attr("y", item.h === 10 ? 1 : 4)
        .attr("rx", 2)
        .attr("fill", item.color);
      gItem
        .append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", theme.legendText)
        .style("font-size", "11px")
        .text(item.label);
      offsetX += Math.max(item.label.length * 7 + 32, 72);
    }
  }

  const detachZoom = dataZoom ? attachCartesianDataZoom(root, plot, innerW, innerH) : () => undefined;

  return () => {
    detachZoom();
    container.replaceChildren();
  };
}
