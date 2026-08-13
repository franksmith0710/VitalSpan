import { useState } from "react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { formatChartFieldErrors, mapChartConfigError } from "@/lib/chartErrors";
import { sanitizeChartFieldsForValidate } from "@/lib/chartFieldRules";
import { ChartConfigPanel } from "@/components/charts/ChartConfigPanel";
import { Button } from "@/components/ui/button";
import type { AiVizArtifactMeta } from "@/lib/aiVizArtifacts";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { CustomVizDataBinding, CustomVizWidgetConfig } from "../layoutUtils";
import { ChartInspectorTabs } from "../ChartInspectorTabs";
import { WidgetInspectorDelete } from "../widget-inspector-delete";
import { WidgetSurfaceAppearanceFields } from "../widgetSurfaceStyleFields";
import { cn } from "@/lib/utils";
import { CustomVizDataOptions } from "./CustomVizDataOptions";
import { CustomVizDataSlots } from "./CustomVizDataSlots";
import { CustomVizStyleForm } from "./CustomVizStyleForm";
import type { CustomVizFieldTarget } from "./customVizFieldSlots";
import { mergeCustomVizStyleValue, resolveCustomVizStyleSchema } from "./customVizStyleSchema";

type CustomVizEditorColumnProps = {
  widgetTitle: string;
  config: CustomVizWidgetConfig;
  manifest?: AiVizArtifactMeta["manifest"];
  activeFieldTarget: CustomVizFieldTarget;
  onActiveFieldTargetChange: (target: CustomVizFieldTarget) => void;
  binding: CustomVizDataBinding;
  chartCfg: ChartViewConfig;
  patchBinding: (patch: Partial<CustomVizDataBinding>) => void;
  columns: string[];
  refreshColumns: () => void;
  onChange: (next: CustomVizWidgetConfig) => void;
  onDelete?: () => void;
  onDataRefresh?: () => void;
  className?: string;
};

export function CustomVizEditorColumn({
  widgetTitle,
  config,
  manifest,
  activeFieldTarget,
  onActiveFieldTargetChange,
  binding,
  chartCfg,
  patchBinding,
  columns,
  refreshColumns,
  onChange,
  onDelete,
  onDataRefresh,
  className,
}: CustomVizEditorColumnProps) {
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [refreshOk, setRefreshOk] = useState(false);
  const resolvedStyleSchema = resolveCustomVizStyleSchema(
    manifest?.styleSchema,
    manifest?.defaultStyle,
  );
  const styleValue = mergeCustomVizStyleValue(config.style, manifest?.defaultStyle);

  const validate = async () => {
    setError(null);
    setFieldError(null);
    setRefreshOk(false);
    setValidating(true);
    try {
      await apiFetch("/api/v1/charts/validate", {
        method: "POST",
        body: JSON.stringify(sanitizeChartFieldsForValidate(chartCfg)),
      });
      refreshColumns();
      onDataRefresh?.();
      setRefreshOk(true);
    } catch (e) {
      const err = e as ApiRequestError;
      const msg = mapChartConfigError(err.code ?? "", err.message);
      if (err.fields?.length) {
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
        <p className="text-theme-xs text-success-600 dark:text-success-400">配置校验通过，数据已刷新</p>
      ) : null}
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="h-8 w-full rounded-md text-[11px] font-medium"
        onClick={() => void validate()}
        disabled={validating}
        tooltip="校验配置并刷新组件数据"
      >
        {validating ? "更新中…" : "更新组件数据"}
      </Button>
    </div>
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900", className)}>
      <ChartInspectorTabs
        className="min-h-0 flex-1"
        scrollMode="panel"
        tabs={["data", "style", "advanced"]}
        dataFooter={dataFooter}
        data={
          <div className="space-y-3">
            <CustomVizDataSlots
              binding={binding}
              fieldSlots={manifest?.fieldSlots}
              columnsDisabled={columns.length === 0}
              activeFieldTarget={activeFieldTarget}
              onActiveFieldTargetChange={onActiveFieldTargetChange}
              onPatch={patchBinding}
            />
            <ChartConfigPanel
              config={chartCfg}
              columns={columns}
              onChange={(next) =>
                patchBinding({
                  dimensions: next.dimensions,
                  metrics: next.metrics?.map((m) => ({
                    field: m.field,
                    agg: "sum" as const,
                  })),
                  filters: next.filters,
                })
              }
              compact
              section="filters"
              omitTimeRange
              addFilterLabel="过滤"
            />
            <CustomVizDataOptions binding={binding} onPatch={patchBinding} />
          </div>
        }
        style={
          <CustomVizStyleForm
            styleSchema={resolvedStyleSchema}
            value={styleValue}
            onChange={(style) => onChange({ ...config, style })}
          />
        }
        advanced={
          <div className="space-y-3">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              组件 ID：{config.artifactId || "—"}
            </p>
            <WidgetSurfaceAppearanceFields
              value={config.widgetStyle ?? {}}
              onChange={(widgetStyle) => onChange({ ...config, widgetStyle })}
              density="narrow"
            />
          </div>
        }
      />
      {onDelete ? (
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
          <WidgetInspectorDelete widgetTitle={widgetTitle} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );
}
