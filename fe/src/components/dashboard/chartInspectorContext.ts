import { createContext, useContext } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { DashboardStyleConfig } from "./dashboardStyleConfig";
import type { LayoutWidget } from "./layoutUtils";
import type { ChartInspectorState } from "./useChartInspectorState";

export type ChartInspectorContextValue = ChartInspectorState & {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
  onTitleChange?: (title: string) => void;
  /** 看板全局样式（组件级标题 show 继承 titleStyle.show） */
  dashboardStyle?: DashboardStyleConfig;
};

/** 单例 Context；Provider 与 consumer 必须从此模块引用，避免循环依赖产生双份 Context。 */
export const ChartInspectorReactContext = createContext<ChartInspectorContextValue | null>(null);

export function useChartInspector(): ChartInspectorContextValue {
  const ctx = useContext(ChartInspectorReactContext);
  if (!ctx) {
    throw new Error("useChartInspector must be used within ChartInspectorProvider");
  }
  return ctx;
}
