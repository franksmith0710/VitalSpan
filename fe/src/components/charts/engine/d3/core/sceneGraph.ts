import * as d3 from "d3";
import {
  applyRotatedCategoryLabels,
  formatAxisCategoryLabel,
  formatHorizontalBandAxisLabel,
  planCategoryAxisLayout,
  resolveBandAxisFontSize,
  resolveHorizontalCategoryAxisLayout,
  resolveNumericTickCount,
  styleAxis,
  type CategoryAxisLayout,
} from "@/components/charts/engine/d3/core/axes";
import { VCDS, getDepthVisual } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { depthExtrudePx } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import {
  reserveLegendMargin,
  type D3LegendItem,
  type D3LegendLayout,
} from "@/components/charts/engine/d3/core/d3Legend";
import type { D3Theme } from "@/components/charts/engine/d3/core/themeEngine";
import { formatChartValue } from "@/lib/chartValueFormat";
import type { ChartAxisStyle } from "@/lib/chartDeStyleBlocks";
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

export type InlineLegendMarginOpts = {
  showLegend?: boolean;
  legendLayout?: D3LegendLayout;
  legendItems?: D3LegendItem[];
};

function applyInlineLegendMargin(
  margin: ReturnType<typeof cartesianMargin>,
  width: number,
  height: number,
  legend?: InlineLegendMarginOpts,
): ReturnType<typeof cartesianMargin> {
  if (!legend?.showLegend) return margin;
  return reserveLegendMargin(
    margin,
    width,
    height,
    legend.legendLayout,
    legend.legendItems ?? [],
  );
}

type BuildCartesianSceneOptions = {
  container: HTMLElement;
  width: number;
  height: number;
  showLegend: boolean;
  legendLayout?: D3LegendLayout;
  legendItems?: D3LegendItem[];
  clipId?: string;
  incremental?: boolean;
  /** 用于小组件下预估横轴旋转并加大 bottom 边距 */
  categories?: string[];
  axisStyle?: ChartAxisStyle;
};

export type ChartSvgLayout = {
  margin: ReturnType<typeof cartesianMargin>;
  innerW: number;
  innerH: number;
};

export type CategoryCartesianLayout = ChartSvgLayout & {
  xLayout: CategoryAxisLayout;
};

export type HorizontalCategoryCartesianLayout = ChartSvgLayout & {
  yLayout: ReturnType<typeof resolveHorizontalCategoryAxisLayout>;
};

/** 与 buildCartesianScene 一致：标准 SVG 根节点 + 允许轴标签溢出 */
export function appendChartSvg(
  container: HTMLElement,
  width: number,
  height: number,
): d3.Selection<SVGSVGElement, unknown, null, undefined> {
  return d3
    .select(container)
    .append("svg")
    .attr("class", "vs-chart-svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .style("overflow", "visible");
}

/** 纵轴类目图：抽稀横轴刻度 + 为旋转标签预留 bottom 边距 */
export function resolveCategoryCartesianLayout(
  width: number,
  height: number,
  categories: string[],
  options?: {
    showLegend?: boolean;
    legendLayout?: D3LegendLayout;
    legendItems?: D3LegendItem[];
    axisStyle?: ChartAxisStyle;
    marginOverrides?: Partial<ReturnType<typeof cartesianMargin>>;
  },
): CategoryCartesianLayout {
  let margin = cartesianMargin(false, options?.marginOverrides);
  const provisionalInnerW = Math.max(0, width - margin.left - margin.right);
  const xLayout = planCategoryAxisLayout(
    categories,
    provisionalInnerW,
    options?.axisStyle?.x?.labelRotate,
  );
  margin = {
    ...margin,
    bottom: margin.bottom + xLayout.extraBottom,
  };
  margin = applyInlineLegendMargin(margin, width, height, {
    showLegend: options?.showLegend,
    legendLayout: options?.legendLayout,
    legendItems: options?.legendItems,
  });
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  return { margin, innerW, innerH, xLayout };
}

/** 横轴类目图：抽稀纵轴刻度 + 按最长标签扩展 left 边距 */
export function resolveHorizontalCategoryCartesianLayout(
  width: number,
  height: number,
  categories: string[],
  options?: {
    showLegend?: boolean;
    legendLayout?: D3LegendLayout;
    legendItems?: D3LegendItem[];
    marginOverrides?: Partial<ReturnType<typeof cartesianMargin>>;
  },
): HorizontalCategoryCartesianLayout {
  const baseMargin = cartesianMargin(false, options?.marginOverrides);
  const provisionalInnerH = Math.max(0, height - baseMargin.top - baseMargin.bottom);
  const yLayout = resolveHorizontalCategoryAxisLayout(categories, provisionalInnerH);
  let margin = {
    ...baseMargin,
    left: Math.max(baseMargin.left, yLayout.leftMargin, options?.marginOverrides?.left ?? 0),
  };
  margin = applyInlineLegendMargin(margin, width, height, {
    showLegend: options?.showLegend,
    legendLayout: options?.legendLayout,
    legendItems: options?.legendItems,
  });
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  return { margin, innerW, innerH, yLayout };
}

export function buildCartesianScene(opts: BuildCartesianSceneOptions): CartesianScene {
  const legendOpts: InlineLegendMarginOpts = {
    showLegend: opts.showLegend,
    legendLayout: opts.legendLayout,
    legendItems: opts.legendItems,
  };
  const { margin, innerW, innerH } =
    opts.categories && opts.categories.length > 0
      ? resolveCategoryCartesianLayout(opts.width, opts.height, opts.categories, {
          showLegend: opts.showLegend,
          legendLayout: opts.legendLayout,
          legendItems: opts.legendItems,
          axisStyle: opts.axisStyle,
        })
      : (() => {
          let baseMargin = cartesianMargin(false);
          baseMargin = applyInlineLegendMargin(baseMargin, opts.width, opts.height, legendOpts);
          return {
            margin: baseMargin,
            innerW: Math.max(0, opts.width - baseMargin.left - baseMargin.right),
            innerH: Math.max(0, opts.height - baseMargin.top - baseMargin.bottom),
          };
        })();
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
  applyPlotClipPadding(clip, innerW, innerH);

  let plot = g.select<SVGGElement>("g.vs-chart-plot");
  if (plot.empty()) {
    plot = g.append("g").attr("class", "vs-chart-plot").attr("clip-path", `url(#${clipId})`);
  } else {
    plot.attr("clip-path", `url(#${clipId})`);
  }

  return { root, defs, g, plot, margin, innerW, innerH, clipId };
}

/** 2.5D 挤出面会超出 plot 盒，须扩展 clip 区域否则顶/右侧面被裁切 */
function applyPlotClipPadding(
  clip: d3.Selection<d3.BaseType, unknown, null, undefined>,
  innerW: number,
  innerH: number,
): void {
  const level = getDepthVisual();
  const pad = level !== "off" ? depthExtrudePx(level) + 1 : 0;
  if (pad <= 0) {
    clip.select("rect").attr("x", 0).attr("y", 0);
    return;
  }
  clip.select("rect").attr("x", 0).attr("y", -pad).attr("width", innerW + pad).attr("height", innerH + pad);
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
  axisStyle?: ChartAxisStyle;
};

export function drawCartesianBandAxes(opts: BandAxesOptions): { rotateX: number } {
  const xLayout = planCategoryAxisLayout(opts.categories, opts.innerW, opts.axisStyle?.x?.labelRotate);

  opts.g.selectAll("g.vs-axis-x, g.vs-axis-y, text.vs-axis-name, text.vs-axis-name-y").remove();

  if (opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-y")
      .call(
        d3
          .axisLeft(opts.yScale)
          .ticks(resolveNumericTickCount(opts.innerH))
          .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
      )
      .call(styleAxis, opts.theme);
  }

  if (opts.axisStyle?.x?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-x")
      .attr("transform", `translate(0,${opts.innerH})`)
      .call(
        d3
          .axisBottom(opts.xScale)
          .tickValues(xLayout.ticks)
          .tickFormat((d) => formatAxisCategoryLabel(String(d), xLayout.slotSpan, xLayout.rotateDeg)),
      )
      .call(styleAxis, opts.theme)
      .call((sel) => applyRotatedCategoryLabels(sel, xLayout.rotateDeg));

    const xName = opts.axisStyle?.x?.name?.trim();
    if (xName) {
      opts.g
        .append("text")
        .attr("class", "vs-axis-name")
        .attr("x", opts.innerW / 2)
        .attr("y", opts.innerH + (xLayout.rotateDeg ? 42 : 32))
        .attr("fill", opts.theme.axisLabel)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(xName);
    }
  }

  const yName = opts.axisStyle?.y?.name?.trim();
  if (yName && opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("text")
      .attr("class", "vs-axis-name-y")
      .attr("transform", "rotate(-90)")
      .attr("x", -opts.innerH / 2)
      .attr("y", -44)
      .attr("fill", opts.theme.axisLabel)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(yName);
  }

  return { rotateX: xLayout.rotateDeg };
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
  axisStyle?: ChartAxisStyle;
};

export function drawCartesianAxes(opts: AxesOptions): { rotateX: number } {
  const xLayout = planCategoryAxisLayout(opts.categories, opts.innerW, opts.axisStyle?.x?.labelRotate);

  opts.g.selectAll("g.vs-axis-x, g.vs-axis-y, text.vs-axis-name, text.vs-axis-name-y").remove();

  if (opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-y")
      .call(
        d3
          .axisLeft(opts.yScale)
          .ticks(resolveNumericTickCount(opts.innerH))
          .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
      )
      .call(styleAxis, opts.theme);
  }

  if (opts.axisStyle?.x?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-x")
      .attr("transform", `translate(0,${opts.innerH})`)
      .call(
        d3
          .axisBottom(opts.xScale)
          .tickValues(xLayout.ticks)
          .tickFormat((d) => formatAxisCategoryLabel(String(d), xLayout.slotSpan, xLayout.rotateDeg)),
      )
      .call(styleAxis, opts.theme)
      .call((sel) => applyRotatedCategoryLabels(sel, xLayout.rotateDeg));

    const xName = opts.axisStyle?.x?.name?.trim();
    if (xName) {
      opts.g
        .append("text")
        .attr("class", "vs-axis-name")
        .attr("x", opts.innerW / 2)
        .attr("y", opts.innerH + (xLayout.rotateDeg ? 42 : 32))
        .attr("fill", opts.theme.axisLabel)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(xName);
    }
  }

  const yName = opts.axisStyle?.y?.name?.trim();
  if (yName && opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("text")
      .attr("class", "vs-axis-name-y")
      .attr("transform", "rotate(-90)")
      .attr("x", -opts.innerH / 2)
      .attr("y", -44)
      .attr("fill", opts.theme.axisLabel)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(yName);
  }

  return { rotateX: xLayout.rotateDeg };
}

type HorizontalBandAxesOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleBand<string>;
  innerW: number;
  innerH: number;
  theme: D3Theme;
  valueFormat?: NumberFormatConfig;
  axisStyle?: ChartAxisStyle;
  /** 覆盖横轴刻度文案（如进度条 0–1 轴显示为百分比） */
  xTickFormat?: (value: d3.NumberValue) => string;
};

/** 横向柱图：x=数值轴，y=类目 band 轴 */
export function drawCartesianHorizontalBandAxes(opts: HorizontalBandAxesOptions): void {
  opts.g.selectAll("g.vs-axis-x, g.vs-axis-y, text.vs-axis-name, text.vs-axis-name-y").remove();

  const categories = opts.yScale.domain();
  const yLayout = resolveHorizontalCategoryAxisLayout(categories, opts.innerH);
  const yAxisFontSize = resolveBandAxisFontSize(yLayout.bandHeight);

  if (opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-y")
      .call(
        d3
          .axisLeft(opts.yScale)
          .tickValues(yLayout.ticks)
          .tickFormat((d) => formatHorizontalBandAxisLabel(String(d), yLayout.labelMaxWidth)),
      )
      .call(styleAxis, opts.theme, yAxisFontSize);
  }

  if (opts.axisStyle?.x?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-x")
      .attr("transform", `translate(0,${opts.innerH})`)
      .call(
        d3
          .axisBottom(opts.xScale)
          .ticks(resolveNumericTickCount(opts.innerW))
          .tickFormat((d) =>
            opts.xTickFormat ? opts.xTickFormat(d) : formatChartValue(d, opts.valueFormat),
          ),
      )
      .call(styleAxis, opts.theme);

    const xName = opts.axisStyle?.x?.name?.trim();
    if (xName) {
      opts.g
        .append("text")
        .attr("class", "vs-axis-name")
        .attr("x", opts.innerW / 2)
        .attr("y", opts.innerH + 32)
        .attr("fill", opts.theme.axisLabel)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(xName);
    }
  }

  const yName = opts.axisStyle?.y?.name?.trim();
  if (yName && opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("text")
      .attr("class", "vs-axis-name-y")
      .attr("transform", "rotate(-90)")
      .attr("x", -opts.innerH / 2)
      .attr("y", -44)
      .attr("fill", opts.theme.axisLabel)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(yName);
  }
}

type LinearAxesOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  innerW: number;
  innerH: number;
  theme: D3Theme;
  valueFormat?: NumberFormatConfig;
  axisStyle?: ChartAxisStyle;
};

/** 散点/象限：双数值轴 */
export function drawLinearCartesianAxes(opts: LinearAxesOptions): void {
  opts.g.selectAll("g.vs-axis-x, g.vs-axis-y, text.vs-axis-name, text.vs-axis-name-y").remove();

  if (opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-y")
      .call(
        d3
          .axisLeft(opts.yScale)
          .ticks(resolveNumericTickCount(opts.innerH))
          .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
      )
      .call(styleAxis, opts.theme);
  }

  if (opts.axisStyle?.x?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-x")
      .attr("transform", `translate(0,${opts.innerH})`)
      .call(
        d3
          .axisBottom(opts.xScale)
          .ticks(resolveNumericTickCount(opts.innerW))
          .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
      )
      .call(styleAxis, opts.theme);

    const xName = opts.axisStyle?.x?.name?.trim();
    if (xName) {
      opts.g
        .append("text")
        .attr("class", "vs-axis-name")
        .attr("x", opts.innerW / 2)
        .attr("y", opts.innerH + 32)
        .attr("fill", opts.theme.axisLabel)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(xName);
    }
  }

  const yName = opts.axisStyle?.y?.name?.trim();
  if (yName && opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("text")
      .attr("class", "vs-axis-name-y")
      .attr("transform", "rotate(-90)")
      .attr("x", -opts.innerH / 2)
      .attr("y", -44)
      .attr("fill", opts.theme.axisLabel)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(yName);
  }
}

type DualAxesOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: d3.ScalePoint<string>;
  yLeft: d3.ScaleLinear<number, number>;
  yRight: d3.ScaleLinear<number, number>;
  categories: string[];
  innerW: number;
  innerH: number;
  theme: D3Theme;
  valueFormat?: NumberFormatConfig;
  axisStyle?: ChartAxisStyle;
};

/** 双轴图：左/右数值轴 + 类目横轴 */
export function drawDualAxesAxes(opts: DualAxesOptions): void {
  const xLayout = planCategoryAxisLayout(opts.categories, opts.innerW, opts.axisStyle?.x?.labelRotate);

  opts.g
    .selectAll("g.vs-axis-x, g.vs-axis-y, g.vs-axis-y-right, text.vs-axis-name, text.vs-axis-name-y")
    .remove();

  if (opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-y")
      .call(
        d3
          .axisLeft(opts.yLeft)
          .ticks(resolveNumericTickCount(opts.innerH))
          .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
      )
      .call(styleAxis, opts.theme);
    opts.g
      .append("g")
      .attr("class", "vs-axis-y-right")
      .attr("transform", `translate(${opts.innerW},0)`)
      .call(
        d3
          .axisRight(opts.yRight)
          .ticks(resolveNumericTickCount(opts.innerH))
          .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
      )
      .call(styleAxis, opts.theme);
  }

  if (opts.axisStyle?.x?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-x")
      .attr("transform", `translate(0,${opts.innerH})`)
      .call(
        d3
          .axisBottom(opts.xScale)
          .tickValues(xLayout.ticks)
          .tickFormat((d) => formatAxisCategoryLabel(String(d), xLayout.slotSpan, xLayout.rotateDeg)),
      )
      .call(styleAxis, opts.theme)
      .call((sel) => applyRotatedCategoryLabels(sel, xLayout.rotateDeg));

    const xName = opts.axisStyle?.x?.name?.trim();
    if (xName) {
      opts.g
        .append("text")
        .attr("class", "vs-axis-name")
        .attr("x", opts.innerW / 2)
        .attr("y", opts.innerH + (xLayout.rotateDeg ? 42 : 32))
        .attr("fill", opts.theme.axisLabel)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(xName);
    }
  }

  const yName = opts.axisStyle?.y?.name?.trim();
  if (yName && opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("text")
      .attr("class", "vs-axis-name-y")
      .attr("transform", "rotate(-90)")
      .attr("x", -opts.innerH / 2)
      .attr("y", -44)
      .attr("fill", opts.theme.axisLabel)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(yName);
  }
}

type BidirectionalAxesOptions = {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  yScale: d3.ScaleBand<string>;
  xScale: d3.ScaleLinear<number, number>;
  innerW: number;
  innerH: number;
  theme: D3Theme;
  valueFormat?: NumberFormatConfig;
  axisStyle?: ChartAxisStyle;
};

/** 双向柱图：类目纵轴 + 底部数值轴 */
export function drawBidirectionalBandAxes(opts: BidirectionalAxesOptions): void {
  opts.g.selectAll("g.vs-axis-x, g.vs-axis-y, text.vs-axis-name, text.vs-axis-name-y").remove();

  const categories = opts.yScale.domain();
  const yLayout = resolveHorizontalCategoryAxisLayout(categories, opts.innerH);
  const yAxisFontSize = resolveBandAxisFontSize(yLayout.bandHeight);

  if (opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-y")
      .call(
        d3
          .axisLeft(opts.yScale)
          .tickValues(yLayout.ticks)
          .tickFormat((d) => formatHorizontalBandAxisLabel(String(d), yLayout.labelMaxWidth)),
      )
      .call(styleAxis, opts.theme, yAxisFontSize);
  }

  if (opts.axisStyle?.x?.show !== false) {
    opts.g
      .append("g")
      .attr("class", "vs-axis-x")
      .attr("transform", `translate(0,${opts.innerH})`)
      .call(
        d3
          .axisBottom(opts.xScale)
          .ticks(resolveNumericTickCount(opts.innerW))
          .tickFormat((d) => formatChartValue(d, opts.valueFormat)),
      )
      .call(styleAxis, opts.theme);

    const xName = opts.axisStyle?.x?.name?.trim();
    if (xName) {
      opts.g
        .append("text")
        .attr("class", "vs-axis-name")
        .attr("x", opts.innerW / 2)
        .attr("y", opts.innerH + 32)
        .attr("fill", opts.theme.axisLabel)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(xName);
    }
  }

  const yName = opts.axisStyle?.y?.name?.trim();
  if (yName && opts.axisStyle?.y?.show !== false) {
    opts.g
      .append("text")
      .attr("class", "vs-axis-name-y")
      .attr("transform", "rotate(-90)")
      .attr("x", -opts.innerH / 2)
      .attr("y", -44)
      .attr("fill", opts.theme.axisLabel)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(yName);
  }
}
