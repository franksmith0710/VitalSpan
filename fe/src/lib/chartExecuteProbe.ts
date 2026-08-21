import { apiFetch, isEmbedShareContext, resolveDatasetExecutePath } from "@/lib/api";
import { createConcurrencyLimiter } from "@/lib/asyncConcurrencyLimiter";
import type { ChartFilterRef, ChartTimeRangeRef, ChartViewConfig, ChartType } from "@/lib/chartViewConfig";
import { isGisMapChartType } from "@/lib/chartViewConfig";
import type { SampleDatasourceItem } from "@/lib/mapChartSalesGeo";
import {
  bindChartConfigDemoDatasource,
  resolveTemplateDemoDatasourceId,
  TEMPLATE_DEMO_DATASOURCE_REF,
} from "@/lib/templateDemoData";
import { migrateChartConfigToDeAxes, resolveChartEncoding } from "@/lib/resolveChartEncoding";
import { groupDatasetFields } from "@/components/dashboard/datasetFieldClassification";
import { nativeBodyHasLegacySqlBinding } from "@/lib/chartNativeBodyUi";

export type ChartExecuteEncoding = {
  chartType: string;
  dimensions: string[];
  metrics: { field: string; agg: "sum" | "avg" | "max" | "min" | "count" }[];
  filters: {
    field: string;
    operator: NonNullable<ChartFilterRef["operator"]>;
    value: ChartFilterRef["value"];
  }[];
  timeRange?: {
    enabled: boolean;
    field?: string;
    start?: string;
    end?: string;
  };
};

function buildChartTimeRangeEncoding(tr?: ChartTimeRangeRef): ChartExecuteEncoding["timeRange"] {
  if (!tr?.enabled) return undefined;
  const params = buildTimeRangeParameters(tr);
  if (!params.time_start || !params.time_end) return undefined;
  return {
    enabled: true,
    field: tr.field,
    start: params.time_start,
    end: params.time_end,
  };
}

/** 图表维/指/过滤/时间 → execute encoding（汇总前 SQL 过滤） */
export function buildChartExecuteEncoding(config: ChartViewConfig): ChartExecuteEncoding {
  const migrated = migrateChartConfigToDeAxes(config);
  const encoding = resolveChartEncoding(migrated);
  const filters = (config.filters ?? [])
    .filter((f) => {
      if (!f.field?.trim()) return false;
      const v = f.value;
      if (v === null || v === undefined) return false;
      if (typeof v === "string" && !v.trim()) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map((f) => ({
      field: f.field.trim(),
      operator: f.operator ?? "eq",
      value: f.value,
    }));
  return {
    chartType: config.chartType,
    dimensions: [...new Set(encoding.dimensions.map((d) => d.field))],
    metrics: encoding.metrics.map((m) => ({ field: m.field, agg: "sum" as const })),
    filters,
    timeRange: buildChartTimeRangeEncoding(config.timeRange),
  };
}

export type ChartExecuteResult = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
};

export const CHART_EXECUTE_LIMIT = 50;

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

export const CHART_EXECUTE_MAX_CONCURRENCY = 3;

export type ChartExecuteMode = "dataset";

/** 图表出数仅支持 Dataset 路径 */
export function resolveChartExecuteMode(_config: ChartViewConfig): ChartExecuteMode {
  return "dataset";
}

export function chartExecuteNotReadyMessage(config: ChartViewConfig): string {
  if (config.bindingId || config.sql?.trim() || config.table || nativeBodyHasLegacySqlBinding(config.nativeBody)) {
    return "请绑定数据集后再出图";
  }
  if (!config.dataSourceId) return "请绑定数据集";
  if (!config.configId) return "请绑定数据集";
  return "请绑定数据集";
}

export function isChartExecuteReady(config: ChartViewConfig): boolean {
  if (config.bindingId || config.sql?.trim() || config.table) return false;
  if (nativeBodyHasLegacySqlBinding(config.nativeBody)) return false;
  return Boolean(config.dataSourceId && config.configId);
}

/** 仅序列化会影响 execute 请求的绑定字段（不含 deStyle/deDisplay 等展示配置） */
export function chartExecuteBindingKey(
  config: ChartViewConfig,
  filterParameters?: Record<string, string>,
  limit: number = CHART_EXECUTE_LIMIT,
): string {
  return JSON.stringify({
    mode: "dataset",
    dataSourceId: config.dataSourceId,
    configId: config.configId,
    configRevision: config.configRevision ?? null,
    datasetId: config.datasetId,
    encoding: buildChartExecuteEncoding(config),
    filterParameters: filterParameters ?? {},
    limit,
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
const executeConcurrencyLimiter = createConcurrencyLimiter(CHART_EXECUTE_MAX_CONCURRENCY);

let cachedDemoDatasourceId: string | null | undefined;

/** 测试用：清空演示数据源缓存 */
export function resetDemoDatasourceExecuteCache(): void {
  cachedDemoDatasourceId = undefined;
}

async function resolveDemoDatasourceRef(dataSourceId: string | undefined): Promise<string | undefined> {
  if (!dataSourceId || dataSourceId !== TEMPLATE_DEMO_DATASOURCE_REF) {
    return dataSourceId;
  }
  // 分享/embed 页 layout 已由后端绑定真实数据源；避免匿名页请求 /datasources。
  if (isEmbedShareContext()) {
    return dataSourceId;
  }
  if (cachedDemoDatasourceId !== undefined) {
    return cachedDemoDatasourceId ?? dataSourceId;
  }
  try {
    const res = await apiFetch<{ items: SampleDatasourceItem[] }>("/api/v1/datasources");
    cachedDemoDatasourceId = resolveTemplateDemoDatasourceId(res.items ?? []) ?? null;
  } catch {
    cachedDemoDatasourceId = null;
  }
  return cachedDemoDatasourceId ?? dataSourceId;
}

async function configForExecute(config: ChartViewConfig): Promise<ChartViewConfig> {
  const dataSourceId = await resolveDemoDatasourceRef(config.dataSourceId);
  return bindChartConfigDemoDatasource(
    dataSourceId === config.dataSourceId ? config : { ...config, dataSourceId },
    dataSourceId !== config.dataSourceId ? dataSourceId : null,
  );
}

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

  const promise = executeConcurrencyLimiter(() => fetchChartExecuteResult(config, options))
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

export async function fetchChartExecuteResult(
  config: ChartViewConfig,
  options: ChartExecuteProbeOptions = {},
): Promise<ChartExecuteResult> {
  const { filterParameters, limit = CHART_EXECUTE_LIMIT } = options;
  const executeConfig = await configForExecute(config);

  if (!isChartExecuteReady(executeConfig)) {
    throw new Error(chartExecuteNotReadyMessage(executeConfig));
  }

  const parameters = {
    ...(filterParameters ?? {}),
  };
  const encoding = buildChartExecuteEncoding(executeConfig);

  return apiFetch<ChartExecuteResult>(resolveDatasetExecutePath(), {
    method: "POST",
    body: JSON.stringify({
      dataSourceId: executeConfig.dataSourceId,
      configId: executeConfig.configId,
      limit,
      parameters,
      encoding,
      rls: { enabled: true },
    }),
  });
}

export function suggestChartFields(columns: string[], chartType: ChartType) {
  if (columns.length === 0) return { dimensions: [], metrics: [] };
  const { dimensions, metrics } = groupDatasetFields(columns);
  if (isGisMapChartType(chartType)) {
    const lng = columns.find((c) => /(?:^|_)(lng|lon|longitude|经度)(?:$|_)/i.test(c));
    const lat = columns.find((c) => /(?:^|_)(lat|latitude|纬度)(?:$|_)/i.test(c));
    if (lng && lat) {
      return {
        dimensions: [{ field: lng }, { field: lat }],
        metrics: metrics[0] ? [{ field: metrics[0] }] : [],
      };
    }
    return { dimensions: [], metrics: [] };
  }
  if (chartType === "table") {
    const dimFields = dimensions.length > 0 ? dimensions : columns;
    return {
      dimensions: dimFields.slice(0, 6).map((field) => ({ field })),
      metrics: metrics.slice(0, 3).map((field) => ({ field })),
    };
  }
  const dimension = dimensions[0] ?? columns[0];
  const metric = metrics[0] ?? columns.find((col) => col !== dimension);
  return {
    dimensions: dimension ? [{ field: dimension }] : [],
    metrics: metric ? [{ field: metric }] : [],
  };
}
