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
  "10s": 10,
  "30s": 30,
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
};

export const CHART_REFRESH_MIN_SEC = 5;
export const CHART_REFRESH_MAX_SEC = 86_400;

/** DataEase 组件级刷新预设 */
export const CHART_REFRESH_PRESET_OPTIONS = [
  { value: "10s", label: "10 秒" },
  { value: "30s", label: "30 秒" },
  { value: "1m", label: "1 分钟" },
  { value: "5m", label: "5 分钟" },
  { value: "15m", label: "15 分钟" },
  { value: "1h", label: "1 小时" },
  { value: "custom", label: "自定义" },
] as const;

export function clampChartRefreshSec(sec: number): number {
  if (!Number.isFinite(sec)) return CHART_REFRESH_MIN_SEC;
  return Math.min(CHART_REFRESH_MAX_SEC, Math.max(CHART_REFRESH_MIN_SEC, Math.round(sec)));
}

export function isCustomRefreshMode(mode?: string): boolean {
  return Boolean(mode?.startsWith("custom:"));
}

export function formatChartRefreshSelectValue(mode?: string): string {
  if (!mode || mode === "off") return "off";
  if (isCustomRefreshMode(mode)) return "custom";
  return mode;
}

export function parseCustomRefreshSec(mode?: string, fallback = 60): number {
  if (!isCustomRefreshMode(mode)) return clampChartRefreshSec(fallback);
  const n = Number.parseInt(mode!.slice("custom:".length), 10);
  return clampChartRefreshSec(Number.isFinite(n) ? n : fallback);
}

export function buildCustomRefreshMode(sec: number): string {
  return `custom:${clampChartRefreshSec(sec)}`;
}

export type CustomRefreshUnit = "s" | "m";

export const CUSTOM_REFRESH_UNIT_OPTIONS = [
  { value: "s" as const, label: "秒" },
  { value: "m" as const, label: "分" },
];

export function splitCustomRefreshSec(
  sec: number,
  preferUnit?: CustomRefreshUnit,
): { amount: number; unit: CustomRefreshUnit } {
  const clamped = clampChartRefreshSec(sec);
  if (preferUnit === "m") {
    return { amount: Math.max(1, Math.round(clamped / 60)), unit: "m" };
  }
  if (preferUnit === "s") {
    return { amount: clamped, unit: "s" };
  }
  if (clamped >= 60 && clamped % 60 === 0) {
    return { amount: clamped / 60, unit: "m" };
  }
  return { amount: clamped, unit: "s" };
}

export function parseCustomRefreshParts(mode?: string): { amount: number; unit: CustomRefreshUnit } {
  return splitCustomRefreshSec(parseCustomRefreshSec(mode, 60));
}

export function buildCustomRefreshFromParts(amount: number, unit: CustomRefreshUnit): string {
  const n = Math.max(1, Math.round(amount));
  const sec = unit === "m" ? n * 60 : n;
  return buildCustomRefreshMode(sec);
}

export function customRefreshAmountBounds(unit: CustomRefreshUnit): { min: number; max: number } {
  if (unit === "m") {
    return { min: 1, max: Math.floor(CHART_REFRESH_MAX_SEC / 60) };
  }
  return { min: CHART_REFRESH_MIN_SEC, max: CHART_REFRESH_MAX_SEC };
}

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
  if (isCustomRefreshMode(mode)) return parseCustomRefreshSec(mode);
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
