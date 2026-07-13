import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type {
  DashboardStyleConfig,
  FilterWidgetConfig,
  MediaWidgetConfig,
  TabsWidgetConfig,
  TextWidgetConfig,
  WidgetType,
} from "./layoutUtils";

export type DashboardWidgetBase = {
  id: string;
  type: WidgetType;
  title: string;
  order: number;
  parentTabsId?: string;
  tabPaneId?: string;
  chartConfig?: ChartViewConfig;
  filterConfig?: FilterWidgetConfig;
  textConfig?: TextWidgetConfig;
  mediaConfig?: MediaWidgetConfig;
  tabsConfig?: TabsWidgetConfig;
};

export type LayoutWidget = DashboardWidgetBase & {
  colSpan: number;
  rowSpan: number;
  gridX?: number;
  gridY?: number;
};

export type PixelLayoutWidget = DashboardWidgetBase & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DashboardCanvas = {
  width: 1440;
  height: number;
};

export type DashboardLayoutV1 = {
  version: 1;
  widgets: LayoutWidget[];
  globalFilters: unknown[];
  styleConfig?: DashboardStyleConfig;
};

export type DashboardLayoutV2 = {
  version: 2;
  canvas: DashboardCanvas;
  widgets: PixelLayoutWidget[];
  globalFilters: unknown[];
  styleConfig?: DashboardStyleConfig;
};

export type DashboardLayout = DashboardLayoutV1 | DashboardLayoutV2;
