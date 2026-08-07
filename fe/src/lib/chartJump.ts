import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { ChartJumpConfig } from "@/lib/chartDeFeatures";
import { chartJumpIsConfigured } from "@/lib/chartDeFeatures";
import type { Linkage } from "@/components/dashboard/dashboardFilterUtils";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";

/** 查看态点击数据点时的跳转上下文 */
export type ChartJumpClickContext = {
  category?: string;
  label?: string;
  value?: number;
};

export const CHART_JUMP_QUERY_PREFIX = "vs_p_";

export function resolveChartJumpParameterKey(
  cfg: ChartViewConfig | undefined,
  jump: ChartJumpConfig,
): string {
  const explicit = jump.parameterKey?.trim();
  if (explicit) return explicit;
  const dim = cfg?.dimensions?.[0]?.field?.trim();
  if (dim) return dim;
  return "category";
}

export function buildChartJumpQueryParams(
  cfg: ChartViewConfig | undefined,
  jump: ChartJumpConfig,
  context?: ChartJumpClickContext,
): Record<string, string> {
  if (!context) return {};
  const raw = (context.category ?? context.label ?? "").trim();
  if (!raw) return {};
  const key = resolveChartJumpParameterKey(cfg, jump);
  return { [`${CHART_JUMP_QUERY_PREFIX}${key}`]: raw };
}

function appendQuery(href: string, params: Record<string, string>): string {
  if (Object.keys(params).length === 0) return href;
  const [base, hash = ""] = href.split("#");
  const [path, search = ""] = base.split("?");
  const merged = new URLSearchParams(search);
  for (const [key, value] of Object.entries(params)) {
    if (value) merged.set(key, value);
  }
  const qs = merged.toString();
  const withQuery = qs ? `${path}?${qs}` : path;
  return hash ? `${withQuery}#${hash}` : withQuery;
}

function applyJumpPlaceholders(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const bare = params[key];
    if (bare) return encodeURIComponent(bare);
    const prefixed = params[`${CHART_JUMP_QUERY_PREFIX}${key}`];
    if (prefixed) return encodeURIComponent(prefixed);
    return `{{${key}}}`;
  });
}

export function buildChartJumpHref(
  jump: ChartJumpConfig,
  context?: ChartJumpClickContext,
  cfg?: ChartViewConfig,
): string | null {
  if (!chartJumpIsConfigured(jump)) return null;
  const queryParams = buildChartJumpQueryParams(cfg, jump, context);

  if (jump.mode === "dashboard") {
    const id = jump.dashboardId?.trim();
    if (!id) return null;
    const base = `/admin/dashboards/${encodeURIComponent(id)}`;
    return appendQuery(base, queryParams);
  }

  const url = jump.url?.trim();
  if (!url) return null;
  let href = /^https?:\/\//i.test(url) || url.startsWith("/") ? url : `https://${url}`;
  if (/\{\{\w+\}\}/.test(href)) {
    const bareParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(queryParams)) {
      if (key.startsWith(CHART_JUMP_QUERY_PREFIX)) {
        bareParams[key.slice(CHART_JUMP_QUERY_PREFIX.length)] = value;
      }
    }
    href = applyJumpPlaceholders(href, { ...queryParams, ...bareParams });
    return href;
  }
  return appendQuery(href, queryParams);
}

/** 从 URL 解析跳转携带的 SQL 参数（vs_p_*） */
export function parseChartJumpSearchParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!key.startsWith(CHART_JUMP_QUERY_PREFIX) || !value.trim()) continue;
    out[key.slice(CHART_JUMP_QUERY_PREFIX.length)] = value;
  }
  return out;
}

/** 目标看板加载：写入筛选器与图表联动参数 */
export function applyChartJumpParamsToDashboard(
  jumpParams: Record<string, string>,
  widgets: LayoutWidget[],
  linkage: Linkage | null,
  filterValues: Record<string, string>,
): { filterValues: Record<string, string>; linkageParams: Record<string, string> } {
  if (Object.keys(jumpParams).length === 0) {
    return { filterValues, linkageParams: {} };
  }
  const nextFilters = { ...filterValues };
  const linkageParams: Record<string, string> = {};

  for (const [parameterKey, value] of Object.entries(jumpParams)) {
    linkageParams[parameterKey] = value;
    for (const filter of linkage?.filters ?? []) {
      if (filter.dimensionRef === parameterKey) {
        nextFilters[filter.filterId] = value;
      }
    }
    for (const widget of widgets) {
      if (widget.type !== "filter" || !widget.filterConfig) continue;
      const fk = widget.filterConfig.parameterKey?.trim() || widget.filterConfig.dimensionRef?.trim();
      if (fk === parameterKey) {
        nextFilters[widget.filterConfig.filterId] = value;
      }
    }
  }

  return { filterValues: nextFilters, linkageParams };
}

export function jumpContextFromCartesianDatum(datum: {
  __category__?: string | number;
  __value__?: string | number;
}): ChartJumpClickContext {
  const category = datum.__category__ != null ? String(datum.__category__) : "";
  const value = Number(datum.__value__);
  return {
    category,
    label: category,
    value: Number.isFinite(value) ? value : undefined,
  };
}

export function jumpContextFromLabel(label: string, value?: number): ChartJumpClickContext {
  const trimmed = label.trim();
  return {
    category: trimmed,
    label: trimmed,
    value: Number.isFinite(value) ? value : undefined,
  };
}
