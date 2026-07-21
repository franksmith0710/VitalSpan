import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { readChartPieStyle } from "@/lib/chartDeStyle";

/** D3 渲染计划样式映射（配色、图例开关等） */
export function applyD3Style(plan: ChartRenderPlan, ctx: ChartStyleContext): ChartRenderPlan {
  if (plan.kind !== "d3") return plan;
  const options = { ...plan.options };
  const tokens = getAntvThemeTokens(ctx.scheme);

  if (ctx.chartColors.length > 0) {
    options.color = ctx.chartColors;
  }

  if (plan.plotType === "Pie") {
    const pieStyle = readChartPieStyle(ctx.deStyle);
    if (pieStyle.innerRadiusPercent != null && pieStyle.innerRadiusPercent > 0) {
      options.innerRadius = pieStyle.innerRadiusPercent / 100;
    }
  }

  options.__d3Theme = tokens;
  options.__showLabel = ctx.showLabel;
  options.__showTooltip = ctx.showTooltip;
  options.__labelFontSize = ctx.labelPresentation.fontSize;
  options.__valueFormat = ctx.valueFormat;
  options.__shellLegend = ctx.shellLegend;
  options.__legendShow = ctx.deStyle.legend?.show !== false;

  if (ctx.dataZoom && (plan.plotType === "Line" || plan.plotType === "Column" || plan.plotType === "Bar")) {
    options.__dataZoom = true;
  }

  return { ...plan, options };
}
