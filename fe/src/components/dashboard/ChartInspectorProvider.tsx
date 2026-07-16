import type { ReactNode } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { DashboardStyleConfig } from "./dashboardStyleConfig";
import type { LayoutWidget } from "./layoutUtils";
import { ChartInspectorReactContext } from "./chartInspectorContext";
import { useChartInspectorState } from "./useChartInspectorState";

type ChartInspectorProviderProps = {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
  onTitleChange?: (title: string) => void;
  dashboardStyle?: DashboardStyleConfig;
  children: ReactNode;
};

export function ChartInspectorProvider({
  widget,
  onChange,
  onTitleChange,
  dashboardStyle,
  children,
}: ChartInspectorProviderProps) {
  const state = useChartInspectorState(widget, onChange);
  return (
    <ChartInspectorReactContext.Provider
      value={{
        ...state,
        widget,
        onChange,
        onTitleChange,
        dashboardStyle,
      }}
    >
      {children}
    </ChartInspectorReactContext.Provider>
  );
}
