import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/api";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  chartExecuteBindingKey,
  fetchChartExecuteResultShared,
  peekChartExecuteCachedResult,
} from "@/lib/chartExecuteProbe";

export {
  buildFilterParameters,
  buildTimeRangeParameters,
  CHART_EXECUTE_LIMIT,
} from "@/lib/chartExecuteProbe";

const SLOW_THRESHOLD_MS = 3000;

type ChartExecuteOptions = {
  filterParameters?: Record<string, string>;
  executeKey?: string;
  limit?: number;
};

export function mapChartQueryError(code: string | undefined, message: string): string {
  switch (code) {
    case "QUERY_TIMEOUT":
      return "查询超时，请缩小数据范围";
    case "QUERY_SYNTAX_ERROR":
      return "SQL 语法错误，请检查配置";
    case "QUERY_TABLE_NOT_FOUND":
      return "表不存在";
    case "CREDENTIAL_DECRYPT_FAILED":
      return "数据源凭证无法解密，请重启后端或在「数据连接」中重新保存密码";
    default:
      return message || "操作失败，请稍后重试";
  }
}

export function useChartExecute(config: ChartViewConfig, options: ChartExecuteOptions = {}) {
  const { filterParameters, executeKey, limit } = options;
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<(string | number | boolean | null)[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slowHint, setSlowHint] = useState(false);

  const configRef = useRef(config);
  const filterRef = useRef(filterParameters);
  const limitRef = useRef(limit);
  const hasDisplayedDataRef = useRef(false);
  configRef.current = config;
  filterRef.current = filterParameters;
  limitRef.current = limit;

  const requestKey = chartExecuteBindingKey(config, filterParameters, limit);

  const run = useCallback(async () => {
    const activeConfig = configRef.current;
    const activeFilters = filterRef.current;
    const showBlockingLoading = !hasDisplayedDataRef.current;
    if (showBlockingLoading) {
      setLoading(true);
    }
    setError(null);
    setSlowHint(false);
    const started = Date.now();
    try {
      if (activeConfig.mode === "dataset" && (!activeConfig.dataSourceId || !activeConfig.configId)) {
        setError("请选择数据源与已绑定配置的 Dataset");
        setColumns([]);
        setRows([]);
        hasDisplayedDataRef.current = false;
        return;
      }

      const data = await fetchChartExecuteResultShared(activeConfig, {
        filterParameters: activeFilters,
        limit: limitRef.current,
      });
      setColumns(data.columns);
      setRows(data.rows);
      hasDisplayedDataRef.current = data.columns.length > 0 || data.rows.length > 0;
      setSlowHint(Date.now() - started > SLOW_THRESHOLD_MS);
    } catch (err) {
      if (err instanceof Error && err.message.includes("筛选值")) {
        setError(err.message);
      } else if (err instanceof Error && err.message.includes("Dataset")) {
        setError(err.message);
      } else if (err instanceof ApiRequestError) {
        setError(mapChartQueryError(err.code, err.message));
      } else if (
        err instanceof Error &&
        /failed to fetch|networkerror|load failed/i.test(err.message)
      ) {
        setError("无法连接后端服务，请确认 uvicorn（:8000）已启动并通过前端 dev 代理访问");
      } else {
        setError(
          mapChartQueryError(
            undefined,
            err instanceof Error ? err.message : "操作失败，请稍后重试",
          ),
        );
      }
      setColumns([]);
      setRows([]);
      hasDisplayedDataRef.current = false;
      setSlowHint(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = peekChartExecuteCachedResult(configRef.current, {
      filterParameters: filterRef.current,
      limit: limitRef.current,
    });
    if (cached) {
      setColumns(cached.columns);
      setRows(cached.rows);
      hasDisplayedDataRef.current =
        cached.columns.length > 0 || cached.rows.length > 0;
      setLoading(false);
      setError(null);
    } else {
      hasDisplayedDataRef.current = false;
    }
    void run();
  }, [requestKey, executeKey, run]);

  return { columns, rows, loading, error, slowHint, rerun: run };
}
