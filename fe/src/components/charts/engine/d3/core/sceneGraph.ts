import * as d3 from "d3";
import { applyRotatedCategoryLabels, pickCategoryTicks, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import type { D3Theme } from "@/components/charts/engine/d3/core/themeEngine";
import { formatChartValue } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";

export type CartesianScene = {
  root: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  plot: d3.Selection<SVGGElement, unknown, null, undefined>;
  margin: ReturnType<typeof cartesianMargin>;
  innerW: number;
  innerH: number;
  clipId: string;
};

type BuildCartesianSceneOptions = {
  container: HTMLElement;
  width: number;
  height: number;
  showLegend: boolean;
  clipId?: string;
  incremental?: boolean;
};

export function buildCartesianScene(opts: BuildCartesianSceneOptions): CartesianScene {
  const margin = cartesianMargin(opts.showLegend);
  const innerW = Math.max(0, opts.width - margin.left - margin.right);
  const innerH = Math.max(0, opts.height - margin.top - margin.bottom);
  const clipId = opts.clipId ?? `vs-clip-${Math.random().toString(36).slice(2, 9)}`;

  let root = d3.select(opts.container).select<SVGSVGElement>("svg.vs-chart-svg");
  if (root.empty() || !opts.incremental) {
    opts.container.replaceChildren();
    root = d3
      .select(opts.container)
      .append("svg")
      .attr("class", "vs-chart-svg")
      .attr("width", opts.width)
      .attr("height", opts.height)
      .attr("role", "img")
      .style("overflow", "visible");
  } else {
    root.attr("width", opts.width).attr("height", opts.height);
  }

  let defs = root.select<SVGDefsElement>("defs");
  if (defs.empty()) defs = root.append("defs");

  let g = root.select<SVGGElement>("g.vs-chart-plot-root");
  if (g.empty()) {
    g = root.append("g").attr("class", "vs-chart-plot-root").attr("transform", `translate(${margin.left},${margin.top})`);
  } else {
    g.attr("transform", `translate(${margin.left},${margin.top})`);
  }

  let clip = defs.select(`#${clipId}`);
  if (clip.empty()) {
    clip = defs.append("clipPath").attr("id", clipId);
    clip.append("rect").attr("rx", 4);
  }
  clip.select("rect").attr("width", innerW).attr("height", innerH);

  let plot = g.select<SVGGElement>("g.vs-chart-plot");
  if (plot.empty()) {
    plot = g.append("g").attr("class", "vs-chart-plot").attr("clip-path", `url(#${clipId})`);
  }

  return { root, defs, g, plot, margin, innerW, innerH, clipId };
}

type GridOptions = {
  yScale: d3.ScaleLinear<number, number>;
  innerW: number;
  theme: D3Theme;
};

export function drawHorizontalGrid(
  plot: d3.Selection<SVGGElement, unknown, null, undefined>,
  { yScale, innerW, theme }: GridOptions,
): void {
  plot.selectAll("g.vs-grid").remove();
  plot
    .append("g")
    .attr("class", "vs-grid")
    .call(
      d3
        .axisLeft(yScale)
        .ticks(5)
        .tickSize(-innerW)
        .tickFormat(() => ""),
    )
    .call((sel) => sel.select(".domain").remove())
    .call((sel) =>
      sel
        .selectAll(".tick line")
        .attr("stroke", theme.gridLine)
        .attr("stroke-opacity", VCDS.grid.opacity)
        .attr("stroke-dasharray", VCDS.grid.dash),
    );
}

type BandAxesOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: d3.ScaleBand<string>;
  yScale: d3.ScaleLinear<number, number>;
  categories: string[];
  innerW: number;
  innerH: number;
  theme: D3Theme;
  valueFormat?: NumberFormatConfig;
};

export function drawCartesianBandAxes(opts: BandAxesOptions): { rotateX: number } {
  const xTicks = pickCategoryTicks(opts.categories, opts.innerW);
  const rotateX =
    xTicks.length >= 6 && opts.innerW / xTicks.length < VCDS.axis.rotateThreshold
      ? VCDS.axis.rotateDeg
      : 0;

  opts.g.selectAll("g.vs-axis-x, g.vs-axis-y").remove();

  opts.g
    .append("g")
    .attr("class", "vs-axis-y")
    .call(
      d3
        .axisLeft(opts.yScale)
        .ticks(5)
        .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
    )
    .call(styleAxis, opts.theme);

  opts.g
    .append("g")
    .attr("class", "vs-axis-x")
    .attr("transform", `translate(0,${opts.innerH})`)
    .call(d3.axisBottom(opts.xScale).tickValues(xTicks))
    .call(styleAxis, opts.theme)
    .call((sel) => applyRotatedCategoryLabels(sel, rotateX));

  return { rotateX };
}

type AxesOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: d3.ScalePoint<string>;
  yScale: d3.ScaleLinear<number, number>;
  categories: string[];
  innerW: number;
  innerH: number;
  theme: D3Theme;
  valueFormat?: NumberFormatConfig;
};

export function drawCartesianAxes(opts: AxesOptions): { rotateX: number } {
  const xTicks = pickCategoryTicks(opts.categories, opts.innerW);
  const rotateX =
    xTicks.length >= 6 && opts.innerW / xTicks.length < VCDS.axis.rotateThreshold
      ? VCDS.axis.rotateDeg
      : 0;

  opts.g.selectAll("g.vs-axis-x, g.vs-axis-y").remove();

  opts.g
    .append("g")
    .attr("class", "vs-axis-x")
    .attr("transform", `translate(0,${opts.innerH})`)
    .call(d3.axisBottom(opts.xScale).tickValues(xTicks))
    .call(styleAxis, opts.theme)
    .call((sel) => applyRotatedCategoryLabels(sel, rotateX));

  opts.g
    .append("g")
    .attr("class", "vs-axis-y")
    .call(
      d3
        .axisLeft(opts.yScale)
        .ticks(5)
        .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
    )
    .call(styleAxis, opts.theme);

  return { rotateX };
}
