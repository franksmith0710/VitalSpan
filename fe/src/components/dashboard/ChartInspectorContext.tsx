import { createContext, useContext, type ReactNode } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { LayoutWidget } from "./layoutUtils";
import {
  useChartInspectorState,
  type ChartInspectorState,
} from "./useChartInspectorState";

export type SlotTarget =
  | { kind: "dimension"; index: number }
  | { kind: "metric"; index: number };

type ChartInspectorContextValue = ChartInspectorState & {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
  onTitleChange?: (title: string) => void;
};

const ChartInspectorContext = createContext<ChartInspectorContextValue | null>(null);

export function useChartInspector(): ChartInspectorContextValue {
  const ctx = useContext(ChartInspectorContext);
  if (!ctx) throw new Error("useChartInspector must be used within ChartInspectorProvider");
  return ctx;
}

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
    <ChartInspectorContext.Provider
      value={{
        ...state,
        widget,
        onChange,
        onTitleChange,
      }}
    >
      {children}
    </ChartInspectorContext.Provider>
  );
}
