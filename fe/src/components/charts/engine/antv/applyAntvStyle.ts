import type { ChartStyleContext } from "@/components/charts/engine/types";
import type { AntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { antvTooltipFormatter } from "@/components/charts/engine/antv/adapters/tooltip";
import { readChartLegendPosition, readChartPieStyle } from "@/lib/chartDeStyle";
import { readChartLegendOrient } from "@/lib/chartLegendPresentation";
import { withCanvasCssTransformSupport } from "@/components/charts/engine/cssTransformSupport";

export function applyAntvStyle(
  plan: AntvRenderPlan,
  ctx: ChartStyleContext,
): AntvRenderPlan {
  if (plan.kind !== "g2plot") return plan;
  const tokens = getAntvThemeTokens(ctx.scheme);
  const options = { ...plan.options };

  if (ctx.chartColors.length > 0) {
    options.color = ctx.chartColors;
  }

  if (plan.plotType === "Pie") {
    const pieStyle = readChartPieStyle(ctx.deStyle);
    if (pieStyle.innerRadiusPercent != null && pieStyle.innerRadiusPercent > 0) {
      options.innerRadius = `${pieStyle.innerRadiusPercent}%`;
    }
  }

  if (!ctx.shellLegend && ctx.deStyle.legend?.show !== false) {
    const orient = readChartLegendOrient(ctx.deStyle);
    options.legend = {
      position: mapLegendPosition(readChartLegendPosition(ctx.deStyle), orient),
      itemName: { style: { fill: tokens.legendText, fontSize: ctx.deStyle.legend?.fontSize ?? 12 } },
    };
  } else {
    options.legend = false;
  }

  options.label = ctx.showLabel
    ? {
        style: {
          fill: ctx.labelPresentation.color ?? tokens.axisLabel,
          fontSize: ctx.labelPresentation.fontSize,
        },
      }
    : false;

  options.tooltip = ctx.showTooltip
    ? {
        formatter: (datum: Record<string, unknown>) => {
          const { name, value } = antvTooltipFormatter(ctx.valueFormat)(datum);
          return { name, value };
        },
      }
    : false;

  if (ctx.dataZoom && (plan.plotType === "Line" || plan.plotType === "Column" || plan.plotType === "Bar")) {
    options.slider = { start: 0, end: 1 };
  }

  options.theme = {
    styleSheet: {
      backgroundColor: tokens.background,
      brandColor: ctx.chartColors[0] ?? "#465fff",
    },
  };

  options.xAxis = {
    label: { style: { fill: tokens.axisLabel } },
    line: { style: { stroke: tokens.axisLine } },
    grid: { line: { style: { stroke: tokens.gridLine } } },
  };
  options.yAxis = {
    label: { style: { fill: tokens.axisLabel } },
    line: { style: { stroke: tokens.axisLine } },
    grid: { line: { style: { stroke: tokens.gridLine } } },
  };

  return { ...plan, options: withCanvasCssTransformSupport(options) };
}

function mapLegendPosition(
  pos: string | undefined,
  orient: string,
): "top" | "bottom" | "left" | "right" {
  if (pos === "left" || pos === "right" || pos === "bottom" || pos === "top") return pos;
  if (orient === "vertical") return "right";
  return "top";
}
