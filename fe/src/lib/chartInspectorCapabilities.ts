import { isAdvancedEchartsType, isKpiType, type ChartViewConfig } from "@/lib/chartViewConfig";

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

const APEX_BASIC = new Set(["bar", "line"]);

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

  if (APEX_BASIC.has(chartType)) {
    return {
      ...base,
      legend: true,
      label: true,
      dataZoom: true,
      styleVariant: true,
      labelFormat: true,
    };
  }

  if (isAdvancedEchartsType(chartType) || chartType === "pie") {
    return {
      ...base,
      legend: true,
      label: false,
      dataZoom: chartType !== "pie",
      styleVariant: chartType === "bar",
      labelFormat: false,
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
