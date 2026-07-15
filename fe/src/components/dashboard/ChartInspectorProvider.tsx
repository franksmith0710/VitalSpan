import type { ReactNode } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { LayoutWidget } from "./layoutUtils";
import { ChartInspectorReactContext } from "./chartInspectorContext";
import { useChartInspectorState } from "./useChartInspectorState";

type ChartInspectorProviderProps = {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
  onTitleChange?: (title: string) => void;
  children: ReactNode;
};

export function ChartInspectorProvider({
  widget,
  onChange,
  onTitleChange,
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
      }}
    >
      {children}
    </ChartInspectorReactContext.Provider>
  );
}
