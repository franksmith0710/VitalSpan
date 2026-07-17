import { apiFetch } from "@/lib/api";
import type { ChartFilterRef, ChartTimeRangeRef, ChartViewConfig } from "@/lib/chartViewConfig";
import type { ChartType } from "@/lib/chartViewConfig";
import { injectSqlParameters } from "@/components/dashboard/dashboardFilterUtils";

export type ChartExecuteResult = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
};

export const CHART_EXECUTE_LIMIT = 100;

export type ChartExecuteProbeOptions = {
  filterParameters?: Record<string, string>;
  limit?: number;
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

export function isChartExecuteReady(config: ChartViewConfig): boolean {
  if (!config.dataSourceId) return false;
  if (config.mode === "dataset") return Boolean(config.configId);
  if (config.mode === "sql") return Boolean(config.sql?.trim());
  return Boolean(config.sql?.trim() || config.table);
}

/** 仅序列化会影响 execute 请求的绑定字段（不含 deStyle/deDisplay 等展示配置） */
export function chartExecuteBindingKey(
  config: ChartViewConfig,
  filterParameters?: Record<string, string>,
  limit: number = CHART_EXECUTE_LIMIT,
): string {
  const mode = config.mode ?? (config.sql?.trim() ? "sql" : config.table ? "table" : "dataset");
  const base: Record<string, unknown> = {
    mode,
    dataSourceId: config.dataSourceId,
    configId: config.configId,
    datasetId: config.datasetId,
    bindingId: config.bindingId,
    filterParameters: filterParameters ?? {},
    limit,
  };

  if (mode === "dataset") {
    return JSON.stringify(base);
  }

  if (mode === "native") {
    return JSON.stringify({
      ...base,
      nativeBody: config.nativeBody,
      index: config.index,
    });
  }

  return JSON.stringify({
    ...base,
    sql: config.sql,
    table: config.table,
    schema: config.schema,
    filters: config.filters,
    timeRange: config.timeRange,
  });
}

/** @deprecated 使用 chartExecuteBindingKey */
export function chartExecuteRequestKey(
  config: ChartViewConfig,
  filterParameters?: Record<string, string>,
): string {
  return chartExecuteBindingKey(config, filterParameters);
}

const inflightExecute = new Map<string, Promise<ChartExecuteResult>>();
const executeResultCache = new Map<string, ChartExecuteResult>();

/** 读取最近一次成功的 execute 结果（用于 remount 时避免 loading 闪屏） */
export function peekChartExecuteCachedResult(
  config: ChartViewConfig,
  options: ChartExecuteProbeOptions = {},
): ChartExecuteResult | undefined {
  const limit = options.limit ?? CHART_EXECUTE_LIMIT;
  const key = chartExecuteBindingKey(config, options.filterParameters, limit);
  return executeResultCache.get(key);
}

/** 合并并发中的相同 execute 请求（画布 + Inspector 共用） */
export async function fetchChartExecuteResultShared(
  config: ChartViewConfig,
  options: ChartExecuteProbeOptions = {},
): Promise<ChartExecuteResult> {
  const limit = options.limit ?? CHART_EXECUTE_LIMIT;
  const key = chartExecuteBindingKey(config, options.filterParameters, limit);
  const pending = inflightExecute.get(key);
  if (pending) return pending;

  const promise = fetchChartExecuteResult(config, options)
    .then((data) => {
      executeResultCache.set(key, data);
      return data;
    })
    .finally(() => {
      if (inflightExecute.get(key) === promise) {
        inflightExecute.delete(key);
      }
    });
  inflightExecute.set(key, promise);
  return promise;
}

/** 测试用：清空 in-flight 去重表 */
export function resetChartExecuteSharedInflight(): void {
  inflightExecute.clear();
  executeResultCache.clear();
}

function queryExecutePath(): string {
  if (typeof window !== "undefined") {
    const embedToken = new URLSearchParams(window.location.search).get("token");
    if (embedToken) return "/api/v1/embed/query/execute";
  }
  return "/api/v1/query/execute";
}

export async function fetchChartExecuteResult(
  config: ChartViewConfig,
  options: ChartExecuteProbeOptions = {},
): Promise<ChartExecuteResult> {
  const { filterParameters, limit = CHART_EXECUTE_LIMIT } = options;

  if (config.mode === "dataset") {
    if (!config.dataSourceId || !config.configId) {
      throw new Error("请选择数据源与已绑定配置的 Dataset");
    }
    return apiFetch<ChartExecuteResult>("/api/v1/query/dataset/execute", {
      method: "POST",
      body: JSON.stringify({
        dataSourceId: config.dataSourceId,
        configId: config.configId,
        limit,
        parameters: filterParameters ?? {},
        rls: { enabled: false },
      }),
    });
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
          limit,
          rls: { enabled: false },
        }
      : {
          dataSourceId: config.dataSourceId,
          mode: config.mode,
          sql,
          schema: config.schema,
          table: config.table,
          limit,
          rls: { enabled: false },
        };

  return apiFetch<ChartExecuteResult>(queryExecutePath(), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function suggestChartFields(columns: string[], chartType: ChartType) {
  if (columns.length === 0) return { dimensions: [], metrics: [] };
  if (chartType === "table") {
    return {
      dimensions: columns.slice(0, 3).map((field) => ({ field })),
      metrics: [],
    };
  }
  return {
    dimensions: [{ field: columns[0] }],
    metrics: columns[1] ? [{ field: columns[1] }] : [],
  };
}
