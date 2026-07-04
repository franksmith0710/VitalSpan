import { useEffect, useState } from "react";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { mapChartConfigError } from "@/lib/chartErrors";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  config: ChartViewConfig;
  columns: string[];
  onChange: (next: ChartViewConfig) => void;
};

export function ChartConfigPanel({ config, columns, onChange }: Props) {
  const [catalog, setCatalog] = useState<ChartTypeCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartTypeCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const spec = catalog.find((c) => c.type === config.chartType);
  const styleVariants = spec?.styleVariants ?? ["default"];

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

  const validate = async () => {
    setError(null);
    setFieldError(null);
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
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="space-y-4">
        <div>
          <Label>维度字段</Label>
          <Select value={config.dimensions?.[0]?.field ?? ""} onValueChange={(v) => updateDim(0, v)}>
            <SelectTrigger className="h-11 rounded-lg">
              <SelectValue placeholder="选择维度" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {spec?.fieldRule?.note ? (
            <p className="mt-1 text-theme-xs text-gray-500">{spec.fieldRule.note}</p>
          ) : null}
        </div>
        <div>
          <Label>度量字段</Label>
          <Select value={config.metrics?.[0]?.field ?? ""} onValueChange={(v) => updateMetric(0, v)}>
            <SelectTrigger className="h-11 rounded-lg">
              <SelectValue placeholder="选择度量" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          <div
            role="alert"
            className="rounded-lg border border-error-500 bg-error-50 p-3 text-theme-sm text-error-700 dark:bg-error-500/15 dark:text-error-400"
          >
            {error}
          </div>
        ) : null}
        <Button type="button" variant="default" className="h-11 rounded-lg" onClick={validate}>
          校验配置
        </Button>
      </div>
    </div>
  );
}
