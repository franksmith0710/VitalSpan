import type { ChartDrillFrame } from "@/lib/chartDrill";
import type { ChartDeFeatures } from "@/lib/chartDeFeatures";
import type { ChartDeStyle } from "@/lib/chartDeStyle";
import type { ChartFieldRef, ChartViewConfig } from "@/lib/chartViewConfig";
import type { ColorScheme, NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartLegendItem } from "@/lib/chartLegendItems";

import type { Geo3dRenderTier } from "@/components/charts/engine/three/geo3dRuntime";

export type ChartEngineId = "d3" | "antv" | "table";

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
  /** 组件 override 与看板默认合并后的调色板 id */
  effectivePaletteId?: string;
  chartColors: string[];
  dataScreenSurface: boolean;
  showLabel: boolean;
  showTooltip: boolean;
  seriesGradient: boolean;
  depthVisual: "off" | "standard" | "enhanced";
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
  /** 表格行列拖拽结果写回 deTableStyle（看板编辑态） */
  onTableStylePatch?: (patch: Partial<import("@/lib/chartDeTableStyle").ChartDeTableStyle>) => void;
  /** 像素画布逻辑尺寸（松手 commit 后驱动引擎 remeasure） */
  layoutFootprint?: { width: number; height: number };
  /** 3D 地图渲染档位：列表缩略图 / 内嵌 / 全屏预览 */
  geo3dRenderTier?: Geo3dRenderTier;
  /** 是否运行 Three rAF（编辑态未选中时 false） */
  geo3dAnimationActive?: boolean;
  /** WebGL 实例槽位 key */
  instanceKey?: string;
};

/** @deprecated 使用 ChartViewModel；兼容过渡期 */
export type RenderSpec = {
  engine: ChartEngineId;
  chartType: string;
  styleVariant: string;
  encoding: { dimensions: ChartFieldRef[]; metrics: ChartFieldRef[] };
  source: Record<string, unknown>;
};
