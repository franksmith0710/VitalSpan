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
  def("gauge", "quota", "g2plot", "antv", GAUGE, MINIMAL),
  def("liquid", "quota", "g2plot", "antv", GAUGE, MINIMAL),
  def("kpi", "quota", "react", "kpi", KPI, KPI_SECTIONS),

  def("table", "table", "react", "table", TABLE, TABLE_SECTIONS, { deprecated: true, migratesTo: "table-info" }),
  def("table-info", "table", "s2", "antv", TABLE, TABLE_SECTIONS),
  def("table-normal", "table", "s2", "antv", TABLE, TABLE_SECTIONS),
  def("table-pivot", "table", "s2", "antv", TABLE, TABLE_SECTIONS),
  def("t-heatmap", "table", "g2plot", "antv", TABLE, MINIMAL),

  def("line", "trend", "d3", "antv", STATS, LINE_BAR_SECTIONS),
  def("area", "trend", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("area-stack", "trend", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("timeline", "trend", "g2plot", "antv", STATS, LINE_BAR_SECTIONS, { deprecated: true, migratesTo: "line" }),

  def("bar", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-stack", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("percentage-bar-stack", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-group", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-group-stack", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("waterfall", "compare", "g2plot", "antv", FLOW, LINE_BAR_SECTIONS),
  def("bar-horizontal", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-stack-horizontal", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("percentage-bar-stack-horizontal", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("bar-range", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("bidirectional-bar", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("progress-bar", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("stock-line", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("bullet-graph", "compare", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),

  def("pie", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS),
  def("pie-donut", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS),
  def("pie-rose", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS),
  def("pie-donut-rose", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS),
  def("radar", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS),
  def("treemap", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS),
  def("word-cloud", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS),
  def("wordCloud", "distribute", "g2plot", "antv", PIE, PIE_SECTIONS, { deprecated: true, migratesTo: "word-cloud" }),

  def("map", "map", "g2", "antv", MAP, GEO_SECTIONS),
  def("heatmap", "map", "g2plot", "antv", MAP, MINIMAL, { deprecated: true, migratesTo: "t-heatmap" }),

  def("scatter", "relation", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("quadrant", "relation", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("funnel", "relation", "g2plot", "antv", FLOW, MINIMAL),
  def("sankey", "relation", "g2plot", "antv", FLOW, MINIMAL),
  def("circle-packing", "relation", "g2plot", "antv", PIE, MINIMAL),
  def("multi-scatter", "relation", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("graph", "relation", "g6", "antv", FLOW, MINIMAL),

  def("combo", "dual_axes", "g2plot", "antv", STATS, LINE_BAR_SECTIONS, { deprecated: true, migratesTo: "chart-mix" }),
  def("chart-mix", "dual_axes", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("chart-mix-group", "dual_axes", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("chart-mix-stack", "dual_axes", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
  def("chart-mix-dual-line", "dual_axes", "g2plot", "antv", STATS, LINE_BAR_SECTIONS),
];
