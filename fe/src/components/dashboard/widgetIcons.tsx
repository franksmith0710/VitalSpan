import {
  BarChart3,
  CalendarClock,
  Grid3x3,
  LineChart,
  Map,
  Table2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ChartType } from "@/lib/chartViewConfig";

export const WIDGET_CHART_ICONS: Partial<Record<ChartType, LucideIcon>> = {
  table: Table2,
  line: LineChart,
  bar: BarChart3,
  map: Map,
  heatmap: Grid3x3,
  kpi: TrendingUp,
  timeline: CalendarClock,
};

export function widgetChartIcon(type: string): LucideIcon {
  return WIDGET_CHART_ICONS[type as ChartType] ?? LineChart;
}

export const WIDGET_CHART_LABELS: Record<string, string> = {
  table: "表格",
  line: "折线图",
  bar: "柱状图",
  map: "地图",
  heatmap: "热力图",
  kpi: "KPI 指标",
  timeline: "时间轴",
};
