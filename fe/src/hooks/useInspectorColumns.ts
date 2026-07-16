import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { fetchChartExecuteResult, isChartExecuteReady } from "@/lib/chartExecuteProbe";

function columnsCacheKey(cfg: ChartViewConfig): string {
  return [
    cfg.mode ?? "sql",
    cfg.dataSourceId ?? "",
    cfg.configId ?? "",
    cfg.datasetId ?? "",
    cfg.sql ?? "",
    cfg.table ?? "",
    cfg.schema ?? "",
  ].join("|");
}

export function useInspectorColumns(cfg: ChartViewConfig) {
  const ready = isChartExecuteReady(cfg);
  const cacheKey = useMemo(() => columnsCacheKey(cfg), [cfg]);
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

    void fetchChartExecuteResult(cfg)
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
  }, [ready, cacheKey, refreshTick]);

  return { columns, loading, ready, refreshColumns };
}
