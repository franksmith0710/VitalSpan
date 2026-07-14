import type { EChartsOption } from "echarts";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartDeStyle } from "./chartDeStyle";
import { echartsTooltipValueFormatter } from "./chartValueFormat";

const LEGEND_LAYOUT: Record<
  NonNullable<ChartDeStyle["legend"]>["position"] & string,
  Record<string, unknown>
> = {
  top: { top: 0, left: "center", orient: "horizontal" },
  bottom: { bottom: 0, left: "center", orient: "horizontal" },
  left: { left: 0, top: "middle", orient: "vertical" },
  right: { right: 0, top: "middle", orient: "vertical" },
};

export function applyDeStyleToEchartsOption(
  option: EChartsOption,
  deStyle: ChartDeStyle,
  dataZoom: boolean,
  options?: { showLabel?: boolean; valueFormat?: NumberFormatConfig },
): EChartsOption {
  const next: EChartsOption = { ...option };
  const legendPos = deStyle.legend?.position ?? "bottom";
  const prevLegend =
    next.legend && typeof next.legend === "object" && !Array.isArray(next.legend)
      ? next.legend
      : {};
  next.legend = {
    ...prevLegend,
    show: deStyle.legend?.show !== false,
    textStyle: {
      ...(typeof prevLegend.textStyle === "object" ? prevLegend.textStyle : {}),
      fontSize: deStyle.legend?.fontSize ?? 12,
    },
    ...LEGEND_LAYOUT[legendPos],
  };

  if (dataZoom) {
    next.dataZoom = [
      { type: "slider", bottom: 8, height: 20 },
      { type: "inside" },
    ];
    const prevGrid =
      next.grid && typeof next.grid === "object" && !Array.isArray(next.grid) ? next.grid : {};
    next.grid = { ...prevGrid, bottom: 48 };
  }

  const showLabel = options?.showLabel ?? false;
  const valueFormat = options?.valueFormat;
  if (valueFormat) {
    const prevTooltip =
      next.tooltip && typeof next.tooltip === "object" ? next.tooltip : {};
    next.tooltip = {
      ...prevTooltip,
      valueFormatter: echartsTooltipValueFormatter(valueFormat),
    };
  }

  if (Array.isArray(next.series)) {
    next.series = next.series.map((s) => {
      if (!s || typeof s !== "object") return s;
      const series = { ...s } as Record<string, unknown>;
      if (showLabel) {
        series.label = {
          ...(typeof series.label === "object" ? series.label : {}),
          show: true,
          fontSize: deStyle.label?.fontSize ?? 12,
          formatter: valueFormat
            ? (params: { value?: unknown }) => {
                const v = params?.value;
                const raw = Array.isArray(v) ? v[v.length - 1] : v;
                return echartsTooltipValueFormatter(valueFormat)(raw);
              }
            : undefined,
        };
      }
      return series;
    });
  }

  return next;
}
