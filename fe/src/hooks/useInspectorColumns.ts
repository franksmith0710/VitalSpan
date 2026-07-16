import { useCallback, useEffect, useState } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  chartExecuteBindingKey,
  fetchChartExecuteResultShared,
  isChartExecuteReady,
} from "@/lib/chartExecuteProbe";

export function useInspectorColumns(cfg: ChartViewConfig) {
  const ready = isChartExecuteReady(cfg);
  const bindingKey = chartExecuteBindingKey(cfg);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshColumns = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!ready) {
      setColumns([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchChartExecuteResultShared(cfg)
      .then((data) => {
        if (!cancelled) setColumns(Array.isArray(data.columns) ? data.columns : []);
      })
      .catch(() => {
        if (!cancelled) setColumns([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, bindingKey, refreshTick]);

  return { columns, loading, ready, refreshColumns };
}
