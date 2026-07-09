import {
  BarChart3,
  CalendarClock,
  Filter,
  Gauge,
  GitBranch,
  Grid3x3,
  LineChart,
  Map as MapIcon,
  Network,
  PieChart,
  Table2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ChartTypeCatalogItem } from "@/lib/chartRegistry";

/** 与后端 ChartTypeSpec.category 对齐；分组标题供 Palette / 类型目录共用 */
export const CHART_CATEGORY_LABELS: Record<string, string> = {
  basic: "基础",
  advanced: "高级",
  geo: "地理",
  indicator: "指标",
  temporal: "时序",
  flow: "流向",
  relation: "关系",
};

export const CHART_CATEGORY_ORDER: readonly string[] = [
  "basic",
  "advanced",
  "geo",
  "indicator",
  "temporal",
  "flow",
  "relation",
] as const;

export const CHART_TYPE_ICONS: Record<string, LucideIcon> = {
  table: Table2,
  line: LineChart,
  bar: BarChart3,
  pie: PieChart,
  gauge: Gauge,
  map: MapIcon,
  heatmap: Grid3x3,
  kpi: TrendingUp,
  timeline: CalendarClock,
  sankey: GitBranch,
  funnel: Filter,
  graph: Network,
};

export const CHART_RENDERER_LABELS: Record<string, string> = {
  table: "表格引擎",
  echarts: "ECharts",
  kpi: "KPI 卡",
};

export const CHART_CAPABILITY_LABELS: Record<string, string> = {
  style_variant: "样式变体",
  field_config: "字段配置",
  render_spec: "渲染规格",
};

/** catalog 请求失败时的完整 12 类型回退（与 backend builtin 一致） */
export const FALLBACK_CATALOG_ITEMS: ChartTypeCatalogItem[] = [
  { type: "table", displayName: "表格", category: "basic", renderer: "table", styleVariants: ["default"], fieldRule: {} },
  { type: "line", displayName: "折线图", category: "basic", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "bar", displayName: "柱状图", category: "basic", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "pie", displayName: "饼图", category: "basic", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "gauge", displayName: "仪表盘", category: "advanced", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "map", displayName: "地图", category: "geo", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "heatmap", displayName: "热力图", category: "geo", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "kpi", displayName: "KPI 指标", category: "indicator", renderer: "kpi", styleVariants: ["default"], fieldRule: {} },
  { type: "timeline", displayName: "时间轴", category: "temporal", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "sankey", displayName: "桑基图", category: "flow", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "funnel", displayName: "漏斗图", category: "flow", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
  { type: "graph", displayName: "关系图", category: "relation", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
];

export function chartCategoryLabel(category: string): string {
  return CHART_CATEGORY_LABELS[category] ?? category;
}

export function chartTypeIcon(type: string): LucideIcon {
  return CHART_TYPE_ICONS[type] ?? LineChart;
}

export type ChartCatalogGroup = {
  category: string;
  label: string;
  items: ChartTypeCatalogItem[];
};

export function groupCatalogItemsByCategory(items: ChartTypeCatalogItem[]): ChartCatalogGroup[] {
  const buckets = new Map<string, ChartTypeCatalogItem[]>();
  for (const item of items) {
    const list = buckets.get(item.category) ?? [];
    list.push(item);
    buckets.set(item.category, list);
  }

  const orderedCategories = [
    ...CHART_CATEGORY_ORDER.filter((c) => buckets.has(c)),
    ...[...buckets.keys()].filter((c) => !CHART_CATEGORY_ORDER.includes(c)).sort(),
  ];

  return orderedCategories.map((category) => ({
    category,
    label: chartCategoryLabel(category),
    items: buckets.get(category) ?? [],
  }));
}
