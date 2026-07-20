import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { activeFieldRefs } from "@/lib/chartConfigState";
import { getEngineIdForChartType } from "@/components/charts/engine/registry";
import type { ChartViewModel, RenderSpec, VizDataset } from "@/components/charts/engine/types";

function buildRenderSource(config: ChartViewConfig): Record<string, unknown> {
  if (config.bindingId) {
    return { bindingId: config.bindingId };
  }
  const source: Record<string, unknown> = {
    mode: config.mode,
    dataSourceId: config.dataSourceId ?? null,
  };
  if (config.mode === "sql") {
    source.sql = config.sql;
  } else if (config.mode === "table") {
    source.schema = config.schema;
    source.table = config.table;
  }
  return source;
}

export function buildChartViewModel(
  config: ChartViewConfig,
  dataset: VizDataset,
): ChartViewModel {
  const chartType = config.chartType;
  return {
    chartType,
    styleVariant: config.styleVariant ?? "default",
    engine: getEngineIdForChartType(chartType),
    encoding: {
      dimensions: activeFieldRefs(config.dimensions),
      metrics: activeFieldRefs(config.metrics),
    },
    dataset,
    source: buildRenderSource(config),
  };
}

export function chartViewModelToRenderSpec(vm: ChartViewModel): RenderSpec {
  return {
    engine: vm.engine,
    chartType: vm.chartType,
    styleVariant: vm.styleVariant,
    encoding: vm.encoding,
    source: vm.source,
  };
}
