import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  isGeoMapChartType,
  isKpiType,
  isMatrixHeatmapChartType,
  isLineOrBarType,
} from "@/lib/chartViewConfig";
import { resolveEngineCapabilities } from "@/components/charts/engine/capabilities";
import { tableInspectorProfile } from "@/lib/chartTableInspector";

export type ChartInspectorCapabilities = {
  legend: boolean;
  label: boolean;
  dataZoom: boolean;
  styleVariant: boolean;
  labelFormat: boolean;
  background: boolean;
  border: boolean;
  remark: boolean;
  markLines: boolean;
  conditional: boolean;
  jump: boolean;
  timeRange: boolean;
};

export function chartInspectorCapabilities(
  chartType: ChartViewConfig["chartType"],
): ChartInspectorCapabilities {
  const engineCaps = resolveEngineCapabilities(chartType);
  const base = {
    background: true,
    border: true,
    remark: true,
  };

  const tableProfile = tableInspectorProfile(chartType);
  if (tableProfile) {
    return {
      ...base,
      legend: false,
      label: false,
      dataZoom: false,
      styleVariant: false,
      labelFormat: false,
      remark: false,
      markLines: false,
      conditional: tableProfile.advancedConditional,
      jump: tableProfile.advancedJump,
      timeRange: tableProfile.advancedTimeRange,
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
      markLines: false,
      conditional: false,
      jump: false,
      timeRange: false,
    };
  }

  const labelFormat =
    isGeoMapChartType(chartType) ||
    isLineOrBarType(chartType) ||
    chartType === "gauge" ||
    chartType === "scatter" ||
    chartType === "multi-scatter" ||
    chartType === "quadrant";

  return {
    ...base,
    legend: engineCaps.legend,
    label: engineCaps.label,
    dataZoom: engineCaps.dataZoom,
    styleVariant: engineCaps.styleVariant,
    labelFormat,
    markLines: engineCaps.markLines,
    conditional: engineCaps.conditional,
    jump:
      !isGeoMapChartType(chartType) &&
      !isMatrixHeatmapChartType(chartType) &&
      !isKpiType(chartType),
    timeRange: !isGeoMapChartType(chartType) && !isKpiType(chartType),
  };
}

export function supportsEmbeddedShellLegend(chartType: ChartViewConfig["chartType"]): boolean {
  return isLineOrBarType(chartType);
}

/** 高级 Tab 是否至少有一项可配置能力 */
export function chartHasAdvancedTab(chartType: ChartViewConfig["chartType"]): boolean {
  const caps = chartInspectorCapabilities(chartType);
  return (
    caps.dataZoom ||
    caps.timeRange ||
    caps.markLines ||
    caps.conditional ||
    caps.jump
  );
}
