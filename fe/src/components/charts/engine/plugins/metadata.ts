import type { EngineCapabilities } from "@/components/charts/engine/capabilities";
import type { ChartPluginDef, DePaletteCategory } from "@/components/charts/engine/plugins/types";
import type { ChartStyleSectionId } from "@/lib/chartStyleSectionRegistry";

const STATS: EngineCapabilities = {
  legend: true,
  label: true,
  dataZoom: true,
  markLines: true,
  conditional: true,
  styleVariant: false,
};

const PIE: EngineCapabilities = {
  legend: true,
  label: true,
  dataZoom: false,
  markLines: false,
  conditional: true,
  styleVariant: false,
};

const GAUGE: EngineCapabilities = {
  legend: false,
  label: true,
  dataZoom: false,
  markLines: false,
  conditional: false,
  styleVariant: false,
};

const MAP: EngineCapabilities = {
  legend: false,
  label: true,
  dataZoom: false,
  markLines: false,
  conditional: false,
  styleVariant: false,
};

const TABLE: EngineCapabilities = {
  legend: false,
  label: false,
  dataZoom: false,
  markLines: false,
  conditional: false,
  styleVariant: false,
};

const FLOW: EngineCapabilities = {
  legend: true,
  label: false,
  dataZoom: false,
  markLines: false,
  conditional: false,
  styleVariant: false,
};

const KPI: EngineCapabilities = {
  legend: false,
  label: false,
  dataZoom: false,
  markLines: false,
  conditional: false,
  styleVariant: false,
};

const LINE_BAR_SECTIONS: ChartStyleSectionId[] = [
  "background",
  "palette",
  "title",
  "remark",
  "legend",
  "label",
];

const PIE_SECTIONS: ChartStyleSectionId[] = LINE_BAR_SECTIONS;
const GEO_SECTIONS: ChartStyleSectionId[] = ["background", "palette", "geo", "title", "remark"];
const TABLE_SECTIONS: ChartStyleSectionId[] = ["tableBasic", "palette", "title", "background"];
const MINIMAL: ChartStyleSectionId[] = ["background", "palette", "title"];
const KPI_SECTIONS: ChartStyleSectionId[] = ["background", "palette", "title", "label"];

function def(
  type: string,
  paletteCategory: DePaletteCategory,
  library: ChartPluginDef["library"],
  renderer: ChartPluginDef["renderer"],
  engineCapabilities: EngineCapabilities,
  properties: ChartStyleSectionId[],
  extra?: Partial<ChartPluginDef>,
): ChartPluginDef {
  return {
    type,
    library,
    paletteCategory,
    renderer,
    engineCapabilities,
    properties,
    ...extra,
  };
}

export const BUILTIN_PLUGIN_DEFS: ChartPluginDef[] = [
  def("gauge", "quota", "d3", "antv", GAUGE, MINIMAL),
  def("liquid", "quota", "d3", "antv", GAUGE, MINIMAL),
  def("kpi", "quota", "d3", "antv", KPI, KPI_SECTIONS),

  def("table", "table", "react", "table", TABLE, TABLE_SECTIONS, { deprecated: true, migratesTo: "table-info" }),
  def("table-info", "table", "d3", "antv", TABLE, TABLE_SECTIONS),
  def("table-normal", "table", "d3", "antv", TABLE, TABLE_SECTIONS),
  def("table-pivot", "table", "d3", "antv", TABLE, TABLE_SECTIONS),
  def("t-heatmap", "table", "d3", "antv", TABLE, MINIMAL),

  def("line", "trend", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("area", "trend", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("area-stack", "trend", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("timeline", "trend", "d3", "antv", STATS, LINE_BAR_SECTIONS, { deprecated: true, migratesTo: "line" }),

  def("bar", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-stack", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("percentage-bar-stack", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-group", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-group-stack", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("waterfall", "compare", "d3", "antv", FLOW, LINE_BAR_SECTIONS),
  def("bar-horizontal", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-stack-horizontal", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("percentage-bar-stack-horizontal", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-range", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("bidirectional-bar", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("progress-bar", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("stock-line", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("bullet-graph", "compare", "d3", "antv", STATS, LINE_BAR_SECTIONS),

  def("pie", "distribute", "d3", "antv", PIE, PIE_SECTIONS),
  def("pie-donut", "distribute", "d3", "antv", PIE, PIE_SECTIONS),
  def("pie-rose", "distribute", "d3", "antv", PIE, PIE_SECTIONS),
  def("pie-donut-rose", "distribute", "d3", "antv", PIE, PIE_SECTIONS),
  def("radar", "distribute", "d3", "antv", PIE, PIE_SECTIONS),
  def("treemap", "distribute", "d3", "antv", PIE, PIE_SECTIONS),
  def("word-cloud", "distribute", "d3", "antv", PIE, PIE_SECTIONS),
  def("wordCloud", "distribute", "d3", "antv", PIE, PIE_SECTIONS, { deprecated: true, migratesTo: "word-cloud" }),

  def("map", "map", "d3", "antv", MAP, GEO_SECTIONS),
  def("heatmap", "map", "d3", "antv", MAP, MINIMAL, { deprecated: true, migratesTo: "t-heatmap" }),

  def("scatter", "relation", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("quadrant", "relation", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("funnel", "relation", "d3", "antv", FLOW, MINIMAL),
  def("sankey", "relation", "d3", "antv", FLOW, MINIMAL),
  def("circle-packing", "relation", "d3", "antv", PIE, MINIMAL),
  def("multi-scatter", "relation", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("graph", "relation", "d3", "antv", FLOW, MINIMAL),

  def("combo", "dual_axes", "d3", "antv", STATS, LINE_BAR_SECTIONS, { deprecated: true, migratesTo: "chart-mix" }),
  def("chart-mix", "dual_axes", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("chart-mix-group", "dual_axes", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("chart-mix-stack", "dual_axes", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("chart-mix-dual-line", "dual_axes", "d3", "antv", STATS, LINE_BAR_SECTIONS),
];
