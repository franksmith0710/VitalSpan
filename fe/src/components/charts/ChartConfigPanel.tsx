import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { mapChartConfigError } from "@/lib/chartErrors";
import type { ChartFilterRef, ChartViewConfig } from "@/lib/chartViewConfig";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeRangeConfig } from "@/components/charts/TimeRangeConfig";

type Props = {
  config: ChartViewConfig;
  columns: string[];
  onChange: (next: ChartViewConfig) => void;
};

const FILTER_OPS = [
  { value: "eq", label: "等于" },
  { value: "neq", label: "不等于" },
  { value: "gt", label: "大于" },
  { value: "gte", label: "大于等于" },
  { value: "lt", label: "小于" },
  { value: "lte", label: "小于等于" },
  { value: "in", label: "包含" },
] as const;

function FieldSelect({
  value,
  columns,
  placeholder,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string;
  columns: string[];
  placeholder: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-11 rounded-lg" aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {columns.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ChartConfigPanel({ config, columns, onChange }: Props) {
  const [catalog, setCatalog] = useState<ChartTypeCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchChartTypeCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const spec = catalog.find((c) => c.type === config.chartType);
  const styleVariants = spec?.styleVariants ?? ["default"];
  const rule = spec?.fieldRule;
  const columnsDisabled = columns.length === 0;

  const updateDim = (idx: number, field: string) => {
    const dimensions = [...(config.dimensions ?? [])];
    dimensions[idx] = { field };
    onChange({ ...config, dimensions });
  };

  const updateMetric = (idx: number, field: string) => {
    const metrics = [...(config.metrics ?? [])];
    metrics[idx] = { field };
    onChange({ ...config, metrics });
  };

  const addDimension = () => {
    const max = rule?.maxDimensions ?? 8;
    const dims = [...(config.dimensions ?? [])];
    if (dims.length >= max) return;
    onChange({ ...config, dimensions: [...dims, { field: columns[0] ?? "" }] });
  };

  const addMetric = () => {
    const max = rule?.maxMetrics ?? 8;
    const metrics = [...(config.metrics ?? [])];
    if (metrics.length >= max) return;
    onChange({ ...config, metrics: [...metrics, { field: columns[0] ?? "" }] });
  };

  const updateFilter = (idx: number, patch: Partial<ChartFilterRef>) => {
    const filters = [...(config.filters ?? [])];
    filters[idx] = { ...filters[idx], ...patch };
    onChange({ ...config, filters });
  };

  const addFilter = () => {
    const filters = [...(config.filters ?? []), { field: columns[0] ?? "", operator: "eq" as const, value: "" }];
    onChange({ ...config, filters });
  };

  const removeFilter = (idx: number) => {
    const filters = (config.filters ?? []).filter((_, i) => i !== idx);
    onChange({ ...config, filters });
  };

  const validate = async () => {
    setError(null);
    setFieldError(null);
    setValidating(true);
    try {
      await apiFetch("/api/v1/charts/validate", { method: "POST", body: JSON.stringify(config) });
    } catch (e) {
      const err = e as ApiRequestError;
      const msg = mapChartConfigError(err.code ?? "", err.message);
      if (err.code === "CHART_INVALID_STYLE_VARIANT") {
        setError(msg);
      } else if (err.fields?.length) {
        setFieldError(err.fields.map((f) => f.message).join("；"));
      } else {
        setError(msg);
      }
    } finally {
      setValidating(false);
    }
  };

  const dimCount = Math.max(rule?.minDimensions ?? 1, config.dimensions?.length ?? 0);
  const metCount = Math.max(rule?.minMetrics ?? 1, config.metrics?.length ?? 0);

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="space-y-4">
        {columnsDisabled ? (
          <p className="text-theme-sm text-gray-500">请先执行查询或选择数据源</p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>维度字段</Label>
            {rule && (config.dimensions?.length ?? 0) < (rule.maxDimensions ?? 8) ? (
              <Button type="button" variant="ghost" size="sm" onClick={addDimension}>
                <Plus className="mr-1 size-4" />
                添加维度
              </Button>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: dimCount }, (_, idx) => (
              <FieldSelect
                key={`dim-${idx}`}
                value={config.dimensions?.[idx]?.field ?? ""}
                columns={columns}
                placeholder="选择维度"
                onChange={(v) => updateDim(idx, v)}
                disabled={columnsDisabled}
              />
            ))}
          </div>
          {spec?.fieldRule?.note ? (
            <p className="text-theme-xs text-gray-500">{spec.fieldRule.note}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>度量字段</Label>
            {rule && (config.metrics?.length ?? 0) < (rule.maxMetrics ?? 8) ? (
              <Button type="button" variant="ghost" size="sm" onClick={addMetric}>
                <Plus className="mr-1 size-4" />
                添加指标
              </Button>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: metCount }, (_, idx) => (
              <FieldSelect
                key={`met-${idx}`}
                value={config.metrics?.[idx]?.field ?? ""}
                columns={columns}
                placeholder="选择度量"
                onChange={(v) => updateMetric(idx, v)}
                disabled={columnsDisabled}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>筛选条件</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addFilter}>
              <Plus className="mr-1 size-4" />
              添加筛选
            </Button>
          </div>
          {(config.filters ?? []).map((f, i) => (
            <div
              key={`filter-${i}`}
              className="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800 sm:grid-cols-3"
            >
              <FieldSelect
                value={f.field}
                columns={columns}
                placeholder="字段"
                onChange={(v) => updateFilter(i, { field: v })}
                disabled={columnsDisabled}
                aria-label={`筛选字段 ${i + 1}`}
              />
              <Select
                value={f.operator ?? "eq"}
                onValueChange={(v) => updateFilter(i, { operator: v as ChartFilterRef["operator"] })}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  className="h-11 rounded-lg"
                  value={String(f.value ?? "")}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  aria-label={`筛选值 ${i + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeFilter(i)}
                  aria-label={`删除筛选条件 ${i + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <TimeRangeConfig
          value={config.timeRange}
          columns={columns}
          disabled={columnsDisabled}
          onChange={(timeRange) => onChange({ ...config, timeRange })}
        />

        <div>
          <Label>样式子类型</Label>
          <Select
            value={config.styleVariant ?? "default"}
            onValueChange={(v) => onChange({ ...config, styleVariant: v })}
          >
            <SelectTrigger className="h-11 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {styleVariants.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {fieldError ? <p className="text-theme-sm text-error-600">{fieldError}</p> : null}
        {error ? (
          <div role="alert" className="rounded-lg border border-error-500 bg-error-50 p-3 text-theme-sm text-error-700 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        ) : null}
        <Button
          type="button"
          variant="primary"
          className="h-11 rounded-lg"
          onClick={validate}
          disabled={validating}
        >
          {validating ? "校验中…" : "校验配置"}
        </Button>
      </div>
    </div>
  );
}
