import { useState } from "react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { mapChartConfigError } from "@/lib/chartErrors";
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
import { INSPECTOR_CTRL } from "./inspectorCompact";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { ChartDataSlots } from "./ChartDataSlots";
import { ensureChartSlotCapacity } from "./chartFieldSlots";
import { useChartInspector } from "./ChartInspectorContext";
import { WidgetInspectorDelete } from "./widget-inspector-delete";

type ChartEditorColumnProps = {
  onDelete?: () => void;
  onOpenLinkage?: () => void;
  onDataRefresh?: () => void;
  className?: string;
};

export function ChartEditorColumn({
  onDelete,
  onOpenLinkage,
  onDataRefresh,
  className,
}: ChartEditorColumnProps) {
  const { widget, cfg, onChange, catalog, columns, refreshColumns } = useChartInspector();

  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [refreshOk, setRefreshOk] = useState(false);

  const typeLabel =
    catalog.find((item) => item.type === cfg.chartType)?.displayName ?? cfg.chartType;

  const validate = async () => {
    setError(null);
    setFieldError(null);
    setRefreshOk(false);
    setValidating(true);
    try {
      await apiFetch("/api/v1/charts/validate", { method: "POST", body: JSON.stringify(cfg) });
      refreshColumns();
      onDataRefresh?.();
      setRefreshOk(true);
    } catch (e) {
      const err = e as ApiRequestError;
      const msg = mapChartConfigError(err.code ?? "", err.message);
      if (err.code === "CHART_INVALID_STYLE_VARIANT") {
        setError(msg);
      } else if (err.fields?.length) {
        setFieldError(err.fields.map((f) => mapChartConfigError("", f.message)).join("；"));
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
        <p className="text-theme-xs text-success-600 dark:text-success-400">配置校验通过，字段已同步</p>
      ) : null}
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="h-8 w-full rounded-md text-[11px] font-medium"
        onClick={() => void validate()}
        disabled={validating}
        title="校验配置并同步字段列；图表数据会随槽位变更自动刷新"
      >
        {validating ? "校验中…" : "校验配置并刷新字段"}
      </Button>
      <p className="text-[10px] leading-snug text-gray-400">数据随维度/指标变更自动查询，无需重复点击</p>
    </div>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white dark:bg-gray-900", className)}>
      <div className="shrink-0 border-b border-gray-200 px-2.5 py-2 dark:border-gray-800">
        <p className="truncate text-theme-xs font-semibold text-gray-800 dark:text-white/90">
          {typeLabel}
        </p>
        {widget.title && widget.title !== typeLabel ? (
          <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
            {widget.title}
          </p>
        ) : null}
      </div>

      <ChartInspectorTabs
        className="min-h-0 flex-1"
        dataFooter={dataFooter}
        data={
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`chart-type-${widget.id}`} className="text-theme-xs text-gray-500">
                切换图表
              </Label>
              <Select
                value={cfg.chartType}
                onValueChange={(chartType) =>
                  onChange(
                    ensureChartSlotCapacity({
                      ...cfg,
                      chartType: chartType as typeof cfg.chartType,
                    }),
                  )
                }
              >
                <SelectTrigger
                  id={`chart-type-${widget.id}`}
                  className={INSPECTOR_CTRL}
                  aria-label="切换图表"
                >
                  <SelectValue placeholder="选择图表类型" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((item) => (
                    <SelectItem key={item.type} value={item.type}>
                      {item.displayName ?? item.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ChartDataSlots />
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
        advanced={<ChartAdvancedPanel onOpenLinkage={onOpenLinkage} />}
      />

      {onDelete ? (
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
          <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );
}
