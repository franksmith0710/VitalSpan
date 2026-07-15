import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_LIMIT,
  MIN_QUERY_LIMIT,
  resolveQueryLimit,
  type DashboardStyleConfig,
} from "@/components/dashboard/dashboardStyleConfig";

export type ChartDeDisplayOptions = {
  refreshMode?: string;
  resultLimit?: string;
};

const REFRESH_SEC: Record<string, number> = {
  "30s": 30,
  "1m": 60,
  "5m": 300,
  "15m": 900,
};

/** DataEase 结果展示：组件级与看板默认共用选项 */
export const CHART_RESULT_LIMIT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "100", label: "100" },
  { value: "500", label: "500" },
  { value: "1000", label: "1000" },
  { value: "10000", label: "10000" },
] as const;

export type ChartResultLimitOption = (typeof CHART_RESULT_LIMIT_OPTIONS)[number]["value"];

/** 看板 defaultQueryLimit → Select value（与组件 deDisplay.resultLimit 同语义） */
export function dashboardQueryLimitSelectValue(limit?: number): ChartResultLimitOption | "100" {
  const value = limit ?? DEFAULT_QUERY_LIMIT;
  if (value >= MAX_QUERY_LIMIT) return "all";
  const hit = CHART_RESULT_LIMIT_OPTIONS.find(
    (opt) => opt.value !== "all" && Number(opt.value) === value,
  );
  return (hit?.value as ChartResultLimitOption | undefined) ?? "100";
}

/** Select value → 看板 defaultQueryLimit 持久化值 */
export function selectValueToDashboardQueryLimit(value: string): number {
  if (value === "all") return MAX_QUERY_LIMIT;
  return parseDeResultLimit(value) ?? DEFAULT_QUERY_LIMIT;
}

export function readChartDeDisplay(cfg: ChartViewConfig): ChartDeDisplayOptions {
  const raw = cfg.nativeBody?.deDisplay;
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const d = raw as ChartDeDisplayOptions;
  return {
    refreshMode: d.refreshMode,
    resultLimit: d.resultLimit,
  };
}

export function patchChartDeDisplay(
  cfg: ChartViewConfig,
  patch: Partial<ChartDeDisplayOptions>,
): ChartViewConfig {
  const prev = readChartDeDisplay(cfg);
  const merged = { ...prev, ...patch };
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deDisplay: merged,
    },
  };
}

/** 解析组件级「结果展示」为 execute limit；`all` → 10000 */
export function parseDeResultLimit(value?: string): number | undefined {
  if (!value || value === "all") return MAX_QUERY_LIMIT;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(MAX_QUERY_LIMIT, Math.max(MIN_QUERY_LIMIT, n));
}

/** 组件级刷新间隔（秒）；`off` 或未设置 → null */
export function parseDeRefreshIntervalSec(mode?: string): number | null {
  if (!mode || mode === "off") return null;
  return REFRESH_SEC[mode] ?? null;
}

/** 看板默认 limit 与组件级 deDisplay.resultLimit 合并 */
export function resolveChartQueryLimit(
  cfg: ChartViewConfig,
  dashboardStyle: DashboardStyleConfig,
): number {
  const raw = cfg.nativeBody?.deDisplay;
  if (!raw || typeof raw !== "object") {
    return resolveQueryLimit(dashboardStyle);
  }
  const de = raw as ChartDeDisplayOptions;
  if (de.resultLimit === "all") return MAX_QUERY_LIMIT;
  if (de.resultLimit) {
    const widgetLimit = parseDeResultLimit(de.resultLimit);
    if (widgetLimit != null) return widgetLimit;
  }
  return resolveQueryLimit(dashboardStyle);
}
