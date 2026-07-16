import { useCallback, useRef, type ReactNode } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  patchChartDeStyle,
  patchChartDeStyleNested,
  type ChartDeStyle,
} from "@/lib/chartDeStyle";
import type { DashboardStyleConfig } from "./dashboardStyleConfig";
import type { LayoutWidget } from "./layoutUtils";
import { defaultChartConfig } from "./layoutUtils";
import { ChartInspectorReactContext } from "./chartInspectorContext";
import { useChartInspectorState } from "./useChartInspectorState";

type ChartInspectorProviderProps = {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
  onTitleChange?: (title: string) => void;
  dashboardStyle?: DashboardStyleConfig;
  dashboardId?: string;
  children: ReactNode;
};

export function ChartInspectorProvider({
  widget,
  onChange,
  onTitleChange,
  dashboardStyle,
  dashboardId,
  children,
}: ChartInspectorProviderProps) {
  const state = useChartInspectorState(widget, onChange);
  const widgetRef = useRef(widget);
  widgetRef.current = widget;

  const readChartConfig = useCallback(
    () => widgetRef.current.chartConfig ?? defaultChartConfig("table"),
    [],
  );

  const patchDeStyle = useCallback(
    (patch: Partial<ChartDeStyle>) => {
      onChange(patchChartDeStyle(readChartConfig(), patch));
    },
    [onChange, readChartConfig],
  );

  const patchDeStyleNested = useCallback(
    <K extends keyof ChartDeStyle>(
      key: K,
      patch: Partial<NonNullable<ChartDeStyle[K]>>,
    ) => {
      onChange(patchChartDeStyleNested(readChartConfig(), key, patch));
    },
    [onChange, readChartConfig],
  );

  const mutateChartConfig = useCallback(
    (mutator: (cfg: ChartViewConfig) => ChartViewConfig) => {
      onChange(mutator(readChartConfig()));
    },
    [onChange, readChartConfig],
  );

  return (
    <ChartInspectorReactContext.Provider
      value={{
        ...state,
        widget,
        onChange,
        onTitleChange,
        dashboardStyle,
        dashboardId,
        patchDeStyle,
        patchDeStyleNested,
        mutateChartConfig,
      }}
    >
      {children}
    </ChartInspectorReactContext.Provider>
  );
}
