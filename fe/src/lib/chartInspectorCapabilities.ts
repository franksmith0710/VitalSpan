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
};

export function chartInspectorCapabilities(
  chartType: ChartViewConfig["chartType"],
): ChartInspectorCapabilities {
  const base = {
    background: true,
    border: true,
    remark: true,
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
    };
  }

  return {
    ...base,
    legend: false,
    label: false,
    dataZoom: false,
    styleVariant: false,
    labelFormat: false,
  };
}

/** 看板内嵌 HTML 外壳图例（对标 DE 柱/线）；饼/漏斗等保留 ECharts 内置图例 */
export function supportsEmbeddedShellLegend(
  chartType: ChartViewConfig["chartType"],
): boolean {
  return isLineOrBarType(chartType);
}
