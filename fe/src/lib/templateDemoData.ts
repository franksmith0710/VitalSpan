import type { DashboardLayout, LayoutWidget } from "@/components/dashboard/layoutUtils";
import { resolveSampleDbDatasource, type SampleDatasourceItem } from "@/lib/mapChartSalesGeo";

/** 与 backend `demo_datasource.TEMPLATE_DEMO_DATASOURCE_REF` 对齐 */
export const TEMPLATE_DEMO_DATASOURCE_REF = "__demo:sample_db__";

function shouldBindChartDataSource(dataSourceId: string | undefined): boolean {
  return !dataSourceId || dataSourceId === TEMPLATE_DEMO_DATASOURCE_REF;
}

function bindWidgetDemoDatasource(widget: LayoutWidget, dataSourceId: string): LayoutWidget {
  if (widget.type !== "chart" || !widget.chartConfig) return widget;
  if (!shouldBindChartDataSource(widget.chartConfig.dataSourceId)) return widget;
  return {
    ...widget,
    chartConfig: {
      ...widget.chartConfig,
      dataSourceId,
    },
  };
}

/** Hub 预览 / 使用模板前：将演示 SQL 绑定到 sample_db 数据源 */
export function bindTemplateDemoDatasource(
  layout: DashboardLayout,
  dataSourceId: string | null | undefined,
): DashboardLayout {
  if (!dataSourceId) return layout;
  if (layout.version === 1) {
    return {
      ...layout,
      widgets: layout.widgets.map((w) => bindWidgetDemoDatasource(w, dataSourceId)),
    };
  }
  return {
    ...layout,
    widgets: layout.widgets.map((w) => bindWidgetDemoDatasource(w, dataSourceId)),
  };
}

export function resolveTemplateDemoDatasourceId(items: SampleDatasourceItem[]): string | null {
  return resolveSampleDbDatasource(items)?.id ?? null;
}

/** 模板是否含需演示库查数的图表（无 bindingId 的 SQL/表模式） */
export function layoutRequiresDemoCharts(layout: DashboardLayout): boolean {
  return layout.widgets.some((widget) => {
    if (widget.type !== "chart") return false;
    const cfg = widget.chartConfig;
    if (!cfg || cfg.bindingId) return false;
    return Boolean(cfg.sql?.trim() || cfg.mode === "table" || cfg.mode === "sql");
  });
}
