import * as d3 from "d3";
import { animateStrokePath } from "@/components/charts/engine/d3/core/animate";
import { appendChartSvg, drawDualAxesAxes, resolveCategoryCartesianLayout } from "@/components/charts/engine/d3/core/sceneGraph";
import { normalizeCartesianData } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import { drawHorizontalMarkLines } from "@/components/charts/engine/d3/core/markLines";
import { attachCartesianDataZoom } from "@/components/charts/engine/d3/core/dataZoom";
import { renderConfiguredInlineLegend, type D3LegendItem } from "@/components/charts/engine/d3/core/d3Legend";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { applyPathDepthShadow } from "@/components/charts/engine/d3/core/depthEngine";
import {
  columnTooltipRows,
  renderDualAxesColumnBars,
  resolveDualAxesColumnMax,
} from "@/components/charts/engine/d3/cartesian/renderDualAxesColumn";
import type {
  D3CartesianDatum,
  D3DualAxesGeometryOption,
  D3DualAxesRenderConfig,
} from "@/components/charts/engine/d3/types";
import { normalizeCategoryAxisDomain } from "@/components/charts/engine/buildDatasetEncoding";
import { formatCartesianDatumLabel, sumCartesianLabelTotal } from "@/components/charts/engine/d3/core/cartesianDataLabel";

function normalizeDataset(
  data: D3CartesianDatum[],
  xField: string,
  yField: string,
  categoryLevelCount?: number,
): { categories: string[]; points: D3CartesianDatum[] } {
  const normalized = normalizeCartesianData(data, xField, yField);
  const { categories } = normalizeCategoryAxisDomain(
    normalized.map((d) => String(d.__category__ ?? "")),
    categoryLevelCount,
  );
  return { categories, points: normalized };
}

function buildDualAxesLegendItems(params: {
  leftGeom: D3DualAxesGeometryOption;
  rightGeom: D3DualAxesGeometryOption;
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  columnSeriesField?: string;
  leftData: D3CartesianDatum[];
  rightData: D3CartesianDatum[];
  colors: string[];
}): D3LegendItem[] {
  const {
    leftGeom,
    rightGeom,
    leftLabel,
    rightLabel,
    leftColor,
    rightColor,
    columnSeriesField,
    leftData,
    rightData,
    colors,
  } = params;
  const items: D3LegendItem[] = [];
  const dualLine = leftGeom.geometry === "line" && rightGeom.geometry === "line";

  const pushLine = (label: string, color: string) => {
    items.push({ label, color, marker: "line", markerWidth: 14, markerHeight: 3 });
  };

  const pushColumnLegend = (
    data: D3CartesianDatum[],
    fallbackLabel: string,
    fallbackColor: string,
    colorOffset = 0,
  ) => {
    if (columnSeriesField) {
      const names = [...new Set(data.map((row) => String(row[columnSeriesField] ?? "")).filter(Boolean))];
      if (names.length > 1) {
        for (const [index, name] of names.entries()) {
          items.push({
            label: name,
            color: colors[(index + colorOffset) % colors.length] ?? fallbackColor,
          });
        }
        return;
      }
    }
    items.push({ label: fallbackLabel, color: fallbackColor });
  };

  if (leftGeom.geometry === "line") {
    pushLine(leftLabel, leftColor);
  } else {
    pushColumnLegend(leftData, leftLabel, leftColor, 0);
  }

  if (rightGeom.geometry === "line") {
    if (dualLine && columnSeriesField) {
      const names = [...new Set(rightData.map((row) => String(row[columnSeriesField] ?? "")).filter(Boolean))];
      if (names.length > 1) {
        for (const [index, name] of names.entries()) {
          pushLine(name, colors[(index + 1) % colors.length] ?? rightColor);
        }
        return items;
      }
    }
    pushLine(rightLabel, rightColor);
  } else {
    pushColumnLegend(rightData, rightLabel, rightColor, 1);
  }

  return items;
}

function renderDualAxesLineSeries(params: {
  plot: d3.Selection<SVGGElement, unknown, null, undefined>;
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  points: D3CartesianDatum[];
  categories: string[];
  x: d3.ScalePoint<string>;
  yScale: d3.ScaleLinear<number, number>;
  color: string;
  smooth?: boolean;
  shadowId: string;
  dotClass: string;
  conditionalRules?: D3DualAxesRenderConfig["conditionalRules"];
  onPointClick?: D3DualAxesRenderConfig["onPointClick"];
}): void {
  const sorted = [...params.points].sort(
    (a, b) => params.categories.indexOf(String(a.__category__)) - params.categories.indexOf(String(b.__category__)),
  );
  const curve = params.smooth ? d3.curveMonotoneX : d3.curveLinear;
  const lineGen = d3
    .line<D3CartesianDatum>()
    .x((d) => params.x(String(d.__category__)) ?? 0)
    .y((d) => params.yScale(Number(d.__value__)))
    .curve(curve);
  const linePath = params.plot
    .append("path")
    .datum(sorted)
    .attr("fill", "none")
    .attr("stroke", params.color)
    .attr("stroke-width", 2.5)
    .attr("stroke-linecap", "round")
    .attr("d", lineGen);
  applyPathDepthShadow(params.defs, linePath, params.color, params.shadowId);
  animateStrokePath(linePath);

  params.plot
    .selectAll(`circle.${params.dotClass}`)
    .data(sorted)
    .join("circle")
    .attr("class", params.dotClass)
    .attr("r", 3)
    .attr("fill", (d) =>
      resolveDatumColor(Number(d.__value__), params.color, params.conditionalRules ?? []),
    )
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("cx", (d) => params.x(String(d.__category__)) ?? 0)
    .attr("cy", (d) => params.yScale(Number(d.__value__)))
    .attr("cursor", params.onPointClick ? "pointer" : "default")
    .on("click", (_event, d) => params.onPointClick?.(d));
}

export function renderD3DualAxesChart(container: HTMLElement, config: D3DualAxesRenderConfig): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0) return () => undefined;

  const {
    width,
    height,
    data: [leftData, rightData],
    xField,
    yField: [leftYField, rightYField],
    geometryOptions,
    columnSeriesField,
    colors,
    theme,
    showTooltip,
    showLegend = true,
    showLabel = false,
    labelFontSize = 12,
    labelColor,
    labelContent,
    seriesGradient = false,
    tooltipPresentation,
    valueFormat,
    markLines = [],
    conditionalRules,
    dataZoom = false,
    onPointClick,
    legendLayout,
    barWidthRatio,
    barRadius,
    axisStyle,
    smooth: styleSmooth,
    categoryLevelCount,
  } = config;
  const lineLabels = config.lineLabels;
  const leftGeom = geometryOptions[0];
  const rightGeom = geometryOptions[1];
  const dualLine = leftGeom.geometry === "line" && rightGeom.geometry === "line";

  const leftSet = normalizeDataset(leftData, xField, leftYField, categoryLevelCount);
  const rightSet = normalizeDataset(rightData, xField, rightYField, categoryLevelCount);
  const { categories, structuralLevelCount } = normalizeCategoryAxisDomain(
    [...new Set([...leftSet.categories, ...rightSet.categories])],
    categoryLevelCount,
  );
  if (categories.length === 0) return () => undefined;

  const leftSmooth = leftGeom.geometry === "line" && (leftGeom.smooth ?? styleSmooth);
  const rightSmooth = rightGeom.geometry === "line" && (rightGeom.smooth ?? styleSmooth);
  const leftColumnOpts =
    leftGeom.geometry === "column" ? leftGeom : { geometry: "column" as const };
  const rightColumnOpts =
    rightGeom.geometry === "column" ? rightGeom : { geometry: "column" as const };

  const leftColor = colors[0] ?? "#465fff";
  const rightColor = colors[1] ?? "#12b76a";
  const leftLabel = lineLabels?.[0] ?? (leftGeom.geometry === "column" ? "柱" : "左");
  const rightLabel = lineLabels?.[1] ?? (rightGeom.geometry === "column" ? "柱" : dualLine ? "右" : "线");
  const legendItems = buildDualAxesLegendItems({
    leftGeom,
    rightGeom,
    leftLabel,
    rightLabel,
    leftColor,
    rightColor,
    columnSeriesField,
    leftData,
    rightData,
    colors,
  });

  const { margin, innerW, innerH } = resolveCategoryCartesianLayout(width, height, categories, {
    showLegend,
    legendLayout,
    legendItems,
    axisStyle,
    categoryLevelCount: structuralLevelCount,
    marginOverrides: { right: 56 },
  });

  const x = d3.scalePoint<string>().domain(categories).range([0, innerW]).padding(0.5);
  const leftMax =
    leftGeom.geometry === "column"
      ? resolveDualAxesColumnMax(
          leftData,
          xField,
          leftYField,
          leftGeom.isGroup || leftGeom.isStack ? columnSeriesField : undefined,
          leftColumnOpts,
        )
      : (d3.max(leftSet.points, (d) => Number(d.__value__)) ?? 0);
  const rightMax =
    rightGeom.geometry === "column"
      ? resolveDualAxesColumnMax(
          rightData,
          xField,
          rightYField,
          rightGeom.isGroup || rightGeom.isStack ? columnSeriesField : undefined,
          rightColumnOpts,
        )
      : dualLine
        ? (d3.max(rightSet.points, (d) => Number(d.__value__)) ?? 0)
        : (d3.max(rightSet.points, (d) => Number(d.__value__)) ?? 0);
  const yLeft = d3.scaleLinear().domain([0, leftMax]).nice().range([innerH, 0]);
  const yRight = d3.scaleLinear().domain([0, rightMax]).nice().range([innerH, 0]);

  const root = appendChartSvg(container, width, height);
  const defs = root.append("defs");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  drawHorizontalMarkLines(plot, markLines, yLeft, innerW);
  const tooltip = showTooltip ? createTooltip(container, theme, tooltipPresentation) : null;

  drawDualAxesAxes({
    g,
    xScale: x,
    yLeft,
    yRight,
    categories,
    innerW,
    innerH,
    theme,
    valueFormat,
    axisStyle,
    categoryLevelCount: structuralLevelCount,
  });

  if (leftGeom.geometry === "column") {
    renderDualAxesColumnBars({
      plot,
      defs,
      columnData: leftData,
      xField,
      columnYField: leftYField,
      columnSeriesField,
      categories,
      x,
      yRight: yLeft,
      innerH,
      innerW,
      columnOpts: leftColumnOpts,
      colors,
      fallbackColor: leftColor,
      theme,
      seriesGradient,
      conditionalRules,
      onPointClick,
      barWidthRatio,
      barRadius,
    });
  } else if (leftGeom.geometry === "line") {
    renderDualAxesLineSeries({
      plot,
      defs,
      points: leftSet.points,
      categories,
      x,
      yScale: yLeft,
      color: leftColor,
      smooth: leftSmooth,
      shadowId: "dual-line-left",
      dotClass: "dual-line-dot",
      conditionalRules,
      onPointClick,
    });
  }

  if (rightGeom.geometry === "column") {
    renderDualAxesColumnBars({
      plot,
      defs,
      columnData: rightData,
      xField,
      columnYField: rightYField,
      columnSeriesField,
      categories,
      x,
      yRight,
      innerH,
      innerW,
      columnOpts: rightColumnOpts,
      colors: colors.slice(1).concat(colors),
      fallbackColor: rightColor,
      theme,
      seriesGradient,
      conditionalRules,
      onPointClick,
      barWidthRatio,
      barRadius,
    });
  } else if (rightGeom.geometry === "line") {
    renderDualAxesLineSeries({
      plot,
      defs,
      points: rightSet.points,
      categories,
      x,
      yScale: yRight,
      color: rightColor,
      smooth: rightSmooth,
      shadowId: dualLine ? "dual-line-right" : "dual-line-1",
      dotClass: dualLine ? "dual-line-dot-2" : "dual-line-dot-right",
      conditionalRules,
      onPointClick,
    });
  }

  if (showLabel) {
    if (leftGeom.geometry === "line") {
      const leftLabelTotal = sumCartesianLabelTotal(leftSet.points);
      plot
        .selectAll("text.dual-line-label-left")
        .data(leftSet.points)
        .join("text")
        .attr("class", "dual-line-label-left")
        .attr("x", (d) => x(String(d.__category__)) ?? 0)
        .attr("y", (d) => yLeft(Number(d.__value__)) - 8)
        .attr("text-anchor", "middle")
        .attr("fill", resolveLabelFill(theme, labelColor))
        .style("font-size", `${labelFontSize}px`)
        .text((d) =>
          formatCartesianDatumLabel(d, {
            hasMultiSeries: false,
            labelContent,
            valueFormat,
            total: leftLabelTotal,
          }),
        );
    }

    if (rightGeom.geometry === "line") {
      const rightLabelTotal = sumCartesianLabelTotal(rightSet.points);
      plot
        .selectAll("text.dual-line-label-right")
        .data(rightSet.points)
        .join("text")
        .attr("class", "dual-line-label-right")
        .attr("x", (d) => x(String(d.__category__)) ?? 0)
        .attr("y", (d) => yRight(Number(d.__value__)) - 8)
        .attr("text-anchor", "middle")
        .attr("fill", resolveLabelFill(theme, labelColor))
        .style("font-size", `${labelFontSize}px`)
        .text((d) =>
          formatCartesianDatumLabel(d, {
            hasMultiSeries: Boolean(columnSeriesField && dualLine),
            labelContent,
            valueFormat,
            total: rightLabelTotal,
          }),
        );
    } else if (rightGeom.geometry === "column") {
      const colPoints = normalizeCartesianData(rightData, xField, rightYField, columnSeriesField);
      const colLabelTotal = sumCartesianLabelTotal(colPoints);
      const hasColSeries = Boolean(columnSeriesField);
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
        .text((d) =>
          formatCartesianDatumLabel(d, {
            hasMultiSeries: hasColSeries,
            labelContent,
            valueFormat,
            total: colLabelTotal,
          }),
        );
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
        const rows: Array<{ name: string; color: string; value: number }> = [];

        if (leftGeom.geometry === "line") {
          const pt = leftSet.points.find((p) => String(p.__category__) === best);
          rows.push({ name: leftLabel, color: leftColor, value: Number(pt?.__value__ ?? 0) });
        } else if (leftGeom.geometry === "column") {
          rows.push(
            ...columnTooltipRows(
              leftData,
              xField,
              leftYField,
              columnSeriesField,
              best,
              colors,
              leftColor,
            ).map((r) => ({ ...r, name: r.name === "柱" ? leftLabel : r.name })),
          );
        }

        if (rightGeom.geometry === "line") {
          const pt = rightSet.points.find((p) => String(p.__category__) === best);
          rows.push({ name: rightLabel, color: rightColor, value: Number(pt?.__value__ ?? 0) });
        } else if (rightGeom.geometry === "column") {
          rows.push(
            ...columnTooltipRows(
              rightData,
              xField,
              rightYField,
              columnSeriesField,
              best,
              colors.slice(1).concat(colors),
              rightColor,
            ).map((r) => ({ ...r, name: r.name === "柱" ? rightLabel : r.name })),
          );
        }

        tooltip?.style("opacity", "1").html(tooltipHtml(best, rows, valueFormat));
        const rect = container.getBoundingClientRect();
        tooltip
          ?.style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
          .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
      })
      .on("mouseleave", () => tooltip?.style("opacity", "0"));
  }

  renderConfiguredInlineLegend(root, showLegend, legendItems, {
    width,
    height,
    margin,
    theme,
    layout: legendLayout,
    fontSize: legendLayout?.fontSize,
  });

  const detachZoom = dataZoom ? attachCartesianDataZoom(root, plot, innerW, innerH, { theme }) : () => undefined;

  return () => {
    detachZoom();
    container.replaceChildren();
  };
}
