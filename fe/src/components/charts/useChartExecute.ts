import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import type { ChartFilterRef, ChartTimeRangeRef, ChartViewConfig } from "@/lib/chartViewConfig";
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

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function buildTimeRangeParameters(tr?: ChartTimeRangeRef): Record<string, string> {
  if (!tr?.enabled) return {};
  const today = utcToday();
  let start: Date;
  const end: Date = today;
  if (tr.mode === "absolute") {
    if (!tr.start || !tr.end) return {};
    return { time_start: tr.start, time_end: tr.end };
  }
  const preset = tr.relativePreset ?? "last_7d";
  switch (preset) {
    case "last_7d":
      start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 7);
      break;
    case "last_30d":
      start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 30);
      break;
    case "last_90d":
      start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 90);
      break;
    case "mtd":
      start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      break;
    case "ytd":
      start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      break;
    default:
      start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 7);
  }
  return { time_start: formatUtcDate(start), time_end: formatUtcDate(end) };
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
      if (config.mode === "dataset") {
        if (!config.dataSourceId || !config.configId) {
          setError("请选择数据源与已绑定配置的 Dataset");
          setColumns([]);
          setRows([]);
          return;
        }
        const data = await apiFetch<ExecuteResult>("/api/v1/query/dataset/execute", {
          method: "POST",
          body: JSON.stringify({
            dataSourceId: config.dataSourceId,
            configId: config.configId,
            limit: CHART_EXECUTE_LIMIT,
            rls: { enabled: false },
          }),
        });
        setColumns(data.columns);
        setRows(data.rows);
        setSlowHint(Date.now() - started > SLOW_THRESHOLD_MS);
        return;
      }

      const timeParams = config.mode === "sql" ? buildTimeRangeParameters(config.timeRange) : {};
      const filterParams =
        config.mode === "sql"
          ? {
              ...filterParameters,
              ...buildFilterParameters(config.filters ?? []),
              ...timeParams,
            }
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
