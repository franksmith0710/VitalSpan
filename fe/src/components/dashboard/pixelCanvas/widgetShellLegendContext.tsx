import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChartLegendStyle } from "@/lib/chartDeStyle";
import type { ChartLegendItem } from "@/lib/chartLegendItems";

export type WidgetShellLegendState = {
  visible: boolean;
  position: NonNullable<ChartLegendStyle["position"]>;
  fontSize: number;
  items: ChartLegendItem[];
};

const EMPTY_LEGEND: WidgetShellLegendState = {
  visible: false,
  position: "bottom",
  fontSize: 12,
  items: [],
};

type WidgetShellLegendContextValue = {
  state: WidgetShellLegendState;
  setState: (patch: Partial<WidgetShellLegendState>) => void;
};

const WidgetShellLegendContext = createContext<WidgetShellLegendContextValue | null>(null);

export function legendItemsKey(items: ChartLegendItem[]): string {
  return items.map((item) => `${item.name}\0${item.color}`).join("|");
}

function legendStateEqual(a: WidgetShellLegendState, b: WidgetShellLegendState): boolean {
  return (
    a.visible === b.visible &&
    a.position === b.position &&
    a.fontSize === b.fontSize &&
    legendItemsKey(a.items) === legendItemsKey(b.items)
  );
}

export function WidgetShellLegendProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<WidgetShellLegendState>(EMPTY_LEGEND);
  const setState = useCallback((patch: Partial<WidgetShellLegendState>) => {
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };
      return legendStateEqual(prev, next) ? prev : next;
    });
  }, []);
  const value = useMemo(() => ({ state, setState }), [state, setState]);
  return (
    <WidgetShellLegendContext.Provider value={value}>{children}</WidgetShellLegendContext.Provider>
  );
}

export function useWidgetShellLegend() {
  return useContext(WidgetShellLegendContext);
}

/** 看板内嵌图表向 pixel-shape-inner 发布图例布局 */
export function usePublishWidgetShellLegend(
  state: WidgetShellLegendState,
  enabled: boolean,
) {
  const ctx = useWidgetShellLegend();
  const setStateRef = useRef(ctx?.setState);
  setStateRef.current = ctx?.setState;
  const stateRef = useRef(state);
  stateRef.current = state;
  const itemsKey = legendItemsKey(state.items);

  useEffect(() => {
    if (!enabled) {
      setStateRef.current?.(EMPTY_LEGEND);
      return;
    }
    setStateRef.current?.(stateRef.current);
  }, [enabled, state.visible, state.position, state.fontSize, itemsKey]);

  useEffect(() => {
    if (!enabled) return;
    return () => {
      setStateRef.current?.(EMPTY_LEGEND);
    };
  }, [enabled]);
}
