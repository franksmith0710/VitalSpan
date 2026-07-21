import * as d3 from "d3";
import { applyRotatedCategoryLabels, pickCategoryTicks, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { animateStrokePath, chartTransition } from "@/components/charts/engine/d3/core/animate";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { normalizeCartesianData } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import type { D3CartesianDatum, D3DualAxesRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = 4;

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
    colors,
    theme,
    showTooltip,
    showLegend = true,
    valueFormat,
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
  const columnMax = d3.max(columnSet.points, (d) => Number(d.__value__)) ?? 0;
  const yLeft = d3.scaleLinear().domain([0, lineMax]).nice().range([innerH, 0]);
  const yRight = d3.scaleLinear().domain([0, columnMax]).nice().range([innerH, 0]);
  const lineColor = colors[0] ?? "#465fff";
  const columnColor = colors[1] ?? "#12b76a";
  const xTicks = pickCategoryTicks(categories, innerW);
  const rotateX = xTicks.length >= 6 && innerW / xTicks.length < 72 ? -32 : 0;
  const curve = lineSmooth ? d3.curveMonotoneX : d3.curveLinear;

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltip(container, theme) : null;

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
  const barWidth = Math.min(28, innerW / Math.max(categories.length, 1) * 0.55);
  plot
    .selectAll("rect.dual-col")
    .data(columnSet.points)
    .join("rect")
    .attr("class", "dual-col")
    .attr("x", (d) => (x(String(d.__category__)) ?? 0) - barWidth / 2)
    .attr("width", barWidth)
    .attr("rx", BAR_RX)
    .attr("fill", columnColor)
    .attr("opacity", columnOpts.isStack ? 0.92 : 1)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const y1 = yRight(Number(d.__value__));
      const h = innerH - y1;
      const sel = d3.select(this as SVGRectElement);
      if (h <= 0) {
        sel.attr("y", y1).attr("height", 0);
        return;
      }
      chartTransition(sel.attr("y", innerH).attr("height", 0))
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("y", y1)
        .attr("height", h);
    })
    .on("click", (_event, d) => onPointClick?.(d));
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
        const colPt = columnSet.points.find((p) => String(p.__category__) === best);
        const lineName = lineLabels?.[0] ?? "线";
        const colName = lineLabels?.[1] ?? (dualLine ? "线2" : "柱");
        tooltip
          ?.style("opacity", "1")
          .html(
            tooltipHtml(
              best,
              [
                { name: lineName, color: lineColor, value: linePt?.__value__ ?? 0 },
                { name: colName, color: columnColor, value: colPt?.__value__ ?? 0 },
              ],
              valueFormat,
            ),
          );
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
    [
      { label: lineName, color: lineColor, w: 14, h: 3 },
      { label: colName, color: columnColor, w: dualLine ? 14 : 10, h: dualLine ? 3 : 10 },
    ].forEach((item, i) => {
      const gItem = legend.append("g").attr("transform", `translate(${i * 72},0)`);
      gItem.append("rect").attr("width", item.w).attr("height", item.h).attr("y", item.h === 10 ? 1 : 4).attr("rx", 2).attr("fill", item.color);
      gItem.append("text").attr("x", 18).attr("y", 10).attr("fill", theme.legendText).style("font-size", "11px").text(item.label);
    });
  }

  return () => container.replaceChildren();
}
