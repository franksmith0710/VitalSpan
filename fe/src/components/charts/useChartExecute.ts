import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import type { ChartFilterRef, ChartViewConfig } from "@/lib/chartViewConfig";
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

export function buildFilterParameters(filters: ChartFilterRef[]): Record<string, string> {
  const params: Record<string, string> = {};
  filters.forEach((f, i) => {
    const key = `filter_${f.field}_${i}`;
    if (f.operator === "in") {
      const val = Array.isArray(f.value) ? f.value : String(f.value).split(",");
      params[key] = val.map(String).join(",");
    } else {
      params[key] = String(f.value);
    }
  });
  return params;
}

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
      const filterParams =
        config.mode === "sql" && config.filters?.length
          ? { ...filterParameters, ...buildFilterParameters(config.filters) }
          : filterParameters;

      let sql = config.sql;
      if (sql && filterParams && Object.keys(filterParams).length) {
        sql = injectSqlParameters(sql, filterParams);
      }

      const body = config.bindingId
        ? { bindingId: config.bindingId, rls: { enabled: false } }
        : config.mode === "native"
          ? {
              dataSourceId: config.dataSourceId,
              mode: "native",
              nativeBody: config.nativeBody,
              index: config.index,
              limit: CHART_EXECUTE_LIMIT,
              rls: { enabled: false },
            }
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
  }, [config, filterParameters]);

  useEffect(() => {
    void run();
  }, [run, executeKey]);

  return { columns, rows, loading, error, slowHint, rerun: run };
}
