import {
  chartTypeIcon as widgetChartIcon,
  CHART_TYPE_ICONS as WIDGET_CHART_ICONS,
  FALLBACK_CATALOG_ITEMS,
} from "@/lib/chartTypeCatalogDisplay";

export { widgetChartIcon, WIDGET_CHART_ICONS, FALLBACK_CATALOG_ITEMS };

/** @deprecated 优先使用 catalog displayName；仅作无 catalog 时的兜底 */
export const WIDGET_CHART_LABELS: Record<string, string> = Object.fromEntries(
  FALLBACK_CATALOG_ITEMS.map((item) => [item.type, item.displayName]),
);
