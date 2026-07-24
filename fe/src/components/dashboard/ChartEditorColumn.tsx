import { useState } from "react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { formatChartFieldErrors, mapChartConfigError } from "@/lib/chartErrors";
import { sanitizeChartFieldsForValidate } from "@/lib/chartFieldRules";
import { ChartConfigPanel } from "@/components/charts/ChartConfigPanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChartAdvancedPanel } from "./ChartAdvancedPanel";
import { ChartStylePanel } from "./ChartStylePanel";
import { ChartDataOptions } from "./ChartDataOptions";
import { ChartTableDataHint } from "./ChartTableDataHint";
import { tableInspectorProfile } from "@/lib/chartTableInspector";
import { migrateChartViewConfig } from "@/lib/migrateChartTypes";
import {
  shouldSyncWidgetTitleOnChartTypeChange,
} from "@/lib/chartTypeDisplayNames";
import { getChartTypeDisplayName } from "@/lib/chartRegistry";
import { INSPECTOR_CTRL } from "./inspectorCompact";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { ChartMapDataPanel } from "./ChartMapDataPanel";
import { ChartDataSlots } from "./ChartDataSlots";
import { ensureChartSlotCapacity } from "./chartFieldSlots";
import { useChartInspector } from "./ChartInspectorContext";
import { WidgetInspectorDelete } from "./widget-inspector-delete";
import { activeFieldRefs } from "@/lib/chartConfigState";
import { chartHasAdvancedTab } from "@/lib/chartInspectorCapabilities";
import { filterVisibleCatalogItems } from "@/lib/chartPaletteTaxonomy";
import { isGeoMapChartType } from "@/lib/chartViewConfig";

function buildValidateSuccessMessage(cfg: ReturnType<typeof useChartInspector>["cfg"]): string {
  const dims = [...new Set(activeFieldRefs(cfg.dimensions).map((d) => d.field))];
  const metrics = [...new Set(activeFieldRefs(cfg.metrics).map((m) => m.field))];
  const parts = [
    `维度 ${dims.join("、") || "—"}`,
    `指标 ${metrics.join("、") || "—"}`,
  ];
  if (dims.length > 1 && (cfg.chartType === "line" || cfg.chartType === "bar")) {
    parts.push(`子类别「${dims[1]}」已用于拆分系列`);
  }
  return `配置校验通过（${parts.join("；")}）`;
}

type ChartEditorColumnProps = {
  onDelete?: () => void;
  onDataRefresh?: () => void;
  className?: string;
};

export function ChartEditorColumn({
  onDelete,
  onDataRefresh,
  className,
}: ChartEditorColumnProps) {
  const { widget, cfg, onChange, catalog, columns, refreshColumns, onTitleChange } = useChartInspector();

  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [refreshOk, setRefreshOk] = useState(false);

  const validate = async () => {
    setError(null);
    setFieldError(null);
    setRefreshOk(false);
    setValidating(true);
    try {
      await apiFetch("/api/v1/charts/validate", {
        method: "POST",
        body: JSON.stringify(sanitizeChartFieldsForValidate(cfg)),
      });
      refreshColumns();
      onDataRefresh?.();
      setRefreshOk(true);
    } catch (e) {
      const err = e as ApiRequestError;
      const msg = mapChartConfigError(err.code ?? "", err.message);
      if (err.code === "CHART_INVALID_STYLE_VARIANT") {
        setError(msg);
      } else if (err.fields?.length) {
        setFieldError(formatChartFieldErrors(err.code ?? "", err.fields));
      } else {
        setError(msg);
      }
    } finally {
      setValidating(false);
    }
  };

  const dataFooter = (
    <div className="shrink-0 space-y-1.5 border-t border-gray-200 bg-white px-2.5 py-2 dark:border-gray-800 dark:bg-gray-900">
      {fieldError ? <p className="text-theme-xs text-error-600">{fieldError}</p> : null}
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-error-500 bg-error-50 p-2 text-theme-xs text-error-700 dark:bg-error-500/15 dark:text-error-400"
        >
          {error}
        </div>
      ) : refreshOk ? (
        <p className="text-theme-xs text-success-600 dark:text-success-400">
          {buildValidateSuccessMessage(cfg)}
        </p>
      ) : null}
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="h-8 w-full rounded-md text-[11px] font-medium"
        onClick={() => void validate()}
        disabled={validating}
        tooltip="校验配置并刷新图表数据"
      >
        {validating ? "更新中…" : "更新图表数据"}
      </Button>
    </div>
  );

  const showAdvancedTab = chartHasAdvancedTab(cfg.chartType);
  const tableProfile = tableInspectorProfile(cfg.chartType);

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-900", className)}>
      <ChartInspectorTabs
        className="min-h-0 flex-1"
        scrollMode="panel"
        tabs={showAdvancedTab ? ["data", "style", "advanced"] : ["data", "style"]}
        dataFooter={dataFooter}
        data={
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`chart-type-${widget.id}`} className="text-theme-xs text-gray-500">
                切换图表
              </Label>
              <Select
                value={cfg.chartType}
                onValueChange={(chartType) => {
                  const oldChartType = cfg.chartType;
                  onChange(
                    ensureChartSlotCapacity(
                      migrateChartViewConfig({
                        ...cfg,
                        chartType: chartType as typeof cfg.chartType,
                      }),
                    ),
                  );
                  if (
                    onTitleChange &&
                    shouldSyncWidgetTitleOnChartTypeChange(widget.title, oldChartType)
                  ) {
                    onTitleChange(getChartTypeDisplayName(chartType));
                  }
                }}
              >
                <SelectTrigger
                  id={`chart-type-${widget.id}`}
                  className={INSPECTOR_CTRL}
                  aria-label="切换图表"
                >
                  <SelectValue placeholder="选择图表类型" />
                </SelectTrigger>
                <SelectContent>
                  {filterVisibleCatalogItems(catalog).map((item) => (
                    <SelectItem key={item.type} value={item.type}>
                      {item.displayName ?? item.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isGeoMapChartType(cfg.chartType) ? <ChartMapDataPanel /> : <ChartDataSlots />}
            {tableProfile ? <ChartTableDataHint /> : null}
            <ChartConfigPanel
              config={cfg}
              columns={columns}
              onChange={onChange}
              compact
              section="filters"
              omitTimeRange
              addFilterLabel="过滤"
            />
            <ChartDataOptions />
          </div>
        }
        style={<ChartStylePanel />}
        advanced={showAdvancedTab ? <ChartAdvancedPanel /> : undefined}
      />

      {onDelete ? (
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
          <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );
}


