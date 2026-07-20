import type { ChartDrillFrame } from "@/lib/chartDrill";
import type { ChartDeFeatures } from "@/lib/chartDeFeatures";
import type { ChartDeStyle } from "@/lib/chartDeStyle";
import type { ChartFieldRef, ChartViewConfig } from "@/lib/chartViewConfig";
import type { ColorScheme, NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartLegendItem } from "@/lib/chartLegendItems";

export type ChartEngineId = "echarts" | "antv" | "table" | "kpi";

export type VizDataset = {
  columns: string[];
  rows: unknown[][];
};

export type ChartViewModel = {
  chartType: string;
  styleVariant: string;
  engine: ChartEngineId;
  encoding: {
    dimensions: ChartFieldRef[];
    metrics: ChartFieldRef[];
  };
  dataset: VizDataset;
  source: Record<string, unknown>;
};

export type ChartStyleContext = {
  scheme: ColorScheme;
  deStyle: ChartDeStyle;
  deFeatures: ChartDeFeatures;
  chartColors: string[];
  dataScreenSurface: boolean;
  showLabel: boolean;
  showTooltip: boolean;
  seriesGradient: boolean;
  dataZoom: boolean;
  valueFormat?: NumberFormatConfig;
  labelPresentation: { fontSize: number; color?: string };
  tooltipPresentation: { fontSize: number; color?: string; background?: string };
  shellLegend: boolean;
  embedEdit: boolean;
  /** 看板组件壳层背景色，表格主题与 legacy EmbeddedChartTable 对齐 */
  widgetShellBg?: string;
};

export type ChartInteractionEvent =
  | { kind: "drill"; value: string; label?: string }
  | { kind: "jump" }
  | { kind: "legend-toggle"; seriesName: string };

export type ChartLegendSnapshot = {
  items: ChartLegendItem[];
};

export type ChartEngineViewProps = {
  viewModel: ChartViewModel;
  style: ChartStyleContext;
  ariaLabel: string;
  isDark?: boolean;
  fill?: boolean;
  height?: number;
  width?: number;
  mapPlaceholderHint?: string;
  mapDrillError?: string | null;
  heatmapPlaceholderHint?: string;
  drillLookupRows?: unknown[][];
  chartConfig?: ChartViewConfig;
  drillStack?: ChartDrillFrame[];
  drillClickField?: string;
  onInteraction?: (event: ChartInteractionEvent) => void;
  /** 跳转交互：点击图表任意区域触发（优先于下钻） */
  onJumpClick?: () => void;
};

/** @deprecated 使用 ChartViewModel；兼容过渡期 */
export type RenderSpec = {
  engine: ChartEngineId;
  chartType: string;
  styleVariant: string;
  encoding: { dimensions: ChartFieldRef[]; metrics: ChartFieldRef[] };
  source: Record<string, unknown>;
};
