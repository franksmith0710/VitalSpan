import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { injectSqlParameters } from "@/components/dashboard/dashboardFilterUtils";

type ExecuteResult = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
};

export const CHART_EXECUTE_LIMIT = 100;
const SLOW_THRESHOLD_MS = 3000;

type ChartExecuteOptions = {
  filterParameters?: Record<string, string>;
  executeKey?: string;
};

export function mapChartQueryError(code: string | undefined, message: string): string {
  switch (code) {
    case "QUERY_TIMEOUT":
      return "查询超时，请缩小数据范围";
    case "QUERY_SYNTAX_ERROR":
      return "SQL 语法错误，请检查配置";
    case "QUERY_TABLE_NOT_FOUND":
      return "表不存在";
    default:
      return message || "操作失败，请稍后重试";
  }
}

export function useChartExecute(config: ChartViewConfig, options: ChartExecuteOptions = {}) {
  const { filterParameters, executeKey } = options;
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<(string | number | boolean | null)[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slowHint, setSlowHint] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSlowHint(false);
    const started = Date.now();
    try {
      let sql = config.sql;
      if (sql && filterParameters && Object.keys(filterParameters).length) {
        sql = injectSqlParameters(sql, filterParameters);
      }
      const body = config.bindingId
        ? { bindingId: config.bindingId, rls: { enabled: false } }
        : {
            dataSourceId: config.dataSourceId,
            mode: config.mode,
            sql,
            schema: config.schema,
            table: config.table,
            limit: CHART_EXECUTE_LIMIT,
            rls: { enabled: false },
          };
      const data = await apiFetch<ExecuteResult>("/api/v1/query/execute", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setColumns(data.columns);
      setRows(data.rows);
      setSlowHint(Date.now() - started > SLOW_THRESHOLD_MS);
    } catch (err) {
      if (err instanceof Error && err.message.includes("筛选值")) {
        setError(err.message);
      } else {
        const apiErr = err as ApiRequestError;
        setError(mapChartQueryError(apiErr.code, apiErr.message));
      }
      setColumns([]);
      setRows([]);
      setSlowHint(false);
    } finally {
      setLoading(false);
    }
  }, [config, filterParameters, executeKey]);

  useEffect(() => {
    void run();
  }, [run]);

  return { columns, rows, loading, error, slowHint, retry: run };
}
