import {
  isExtendedEchartsType,
  isKpiType,
  isLineOrBarType,
  type ChartViewConfig,
} from "@/lib/chartViewConfig";

export type ChartInspectorCapabilities = {
  legend: boolean;
  label: boolean;
  dataZoom: boolean;
  styleVariant: boolean;
  labelFormat: boolean;
  background: boolean;
  border: boolean;
  remark: boolean;
  /** 高级 Tab · 辅助线 */
  markLines: boolean;
  /** 高级 Tab · 条件样式 */
  conditional: boolean;
  /** 高级 Tab · 跳转 */
  jump: boolean;
  /** 高级 Tab · 时间范围 */
  timeRange: boolean;
};

export function chartInspectorCapabilities(
  chartType: ChartViewConfig["chartType"],
): ChartInspectorCapabilities {
  const base = {
    background: true,
    border: true,
    remark: true,
  };

  const advanced = {
    markLines: false,
    conditional: false,
    jump: true,
    timeRange: true,
  };

  if (chartType === "table") {
    return {
      ...base,
      legend: false,
      label: false,
      dataZoom: false,
      styleVariant: false,
      labelFormat: false,
      remark: false,
      ...advanced,
      conditional: false,
      markLines: false,
      jump: true,
    };
  }

  if (isKpiType(chartType)) {
    return {
      ...base,
      legend: false,
      label: false,
      dataZoom: false,
      styleVariant: false,
      labelFormat: true,
      remark: false,
      ...advanced,
      jump: false,
      timeRange: false,
    };
  }

  if (isLineOrBarType(chartType)) {
    return {
      ...base,
      legend: true,
      label: true,
      dataZoom: true,
      styleVariant: true,
      labelFormat: true,
      markLines: true,
      conditional: true,
      jump: true,
      timeRange: true,
    };
  }

  if (chartType === "map") {
    return {
      ...base,
      legend: false,
      label: true,
      dataZoom: false,
      styleVariant: false,
      labelFormat: true,
      ...advanced,
      conditional: false,
      jump: false,
    };
  }

  if (chartType === "heatmap") {
    return {
      ...base,
      legend: false,
      label: false,
      dataZoom: false,
      styleVariant: false,
      labelFormat: false,
      ...advanced,
      jump: false,
    };
  }

  if (chartType === "pie") {
    return {
      ...base,
      legend: true,
      label: true,
      dataZoom: false,
      styleVariant: true,
      labelFormat: false,
      ...advanced,
      conditional: true,
      markLines: false,
    };
  }

  if (isExtendedEchartsType(chartType)) {
    return {
      ...base,
      legend: chartType !== "heatmap",
      label: chartType === "map",
      dataZoom: chartType === "timeline",
      styleVariant: false,
      labelFormat: chartType === "map",
      ...advanced,
      markLines: chartType === "timeline",
      conditional: false,
    };
  }

  return {
    ...base,
    legend: false,
    label: false,
    dataZoom: false,
    styleVariant: false,
    labelFormat: false,
    ...advanced,
    jump: false,
  };
}

/** 看板内嵌 HTML 外壳图例（对标 DE 柱/线）；饼/漏斗等保留 ECharts 内置图例 */
export function supportsEmbeddedShellLegend(
  chartType: ChartViewConfig["chartType"],
): boolean {
  return isLineOrBarType(chartType);
}
