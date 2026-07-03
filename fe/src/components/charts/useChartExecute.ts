import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

type ExecuteResult = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
};

export function useChartExecute(config: ChartViewConfig) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<(string | number | boolean | null)[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = config.bindingId
        ? { bindingId: config.bindingId, rls: { enabled: false } }
        : {
            dataSourceId: config.dataSourceId,
            mode: config.mode,
            sql: config.sql,
            schema: config.schema,
            table: config.table,
            limit: 100,
            rls: { enabled: false },
          };
      const data = await apiFetch<ExecuteResult>("/api/v1/query/execute", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setColumns(data.columns);
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
      setColumns([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void run();
  }, [run]);

  return { columns, rows, loading, error, retry: run };
}
