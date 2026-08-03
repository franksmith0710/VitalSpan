import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMetricValue } from "@/components/dashboard/dashboardStyleConfig";
import { ChartDeAttrField, CHART_DE_INPUT } from "../chartInspectorDeFields";
import { INSPECTOR_HINT, INSPECTOR_SELECT } from "../inspectorCompact";
import type { ChartDeStyle } from "@/lib/chartDeStyle";
import { resolveLiquidMetricFormat } from "@/lib/liquidLabelFormat";

const METRIC_FORMAT_TYPES = [
  { value: "auto", label: "自动" },
  { value: "number", label: "数值" },
  { value: "currency", label: "货币" },
] as const;

const RATIO_DECIMAL_LABELS = ["零位", "一位", "二位", "三位", "四位"] as const;

type ChartLiquidLabelFieldsProps = {
  label: ChartDeStyle["label"];
  patchLabel: (patch: Partial<NonNullable<ChartDeStyle["label"]>>) => void;
};

export function ChartLiquidLabelFields({ label, patchLabel }: ChartLiquidLabelFieldsProps) {
  const showMetric = label?.showMetric !== false;
  const showRatio = label?.showRatio === true;

  const metricUnit = label?.metricUnit ?? label?.unit;
  const unitSelectValue =
    !metricUnit
      ? "none"
      : metricUnit === "千" || metricUnit === "万" || metricUnit === "亿"
        ? metricUnit
        : "custom";

  const metricFormat = resolveLiquidMetricFormat(label);
  const metricPreview = formatMetricValue(61930, metricFormat);
  const ratioPreview = formatMetricValue(1, {
    type: "percent",
    decimals: label?.ratioDecimals ?? 0,
    thousandSeparator: metricFormat.thousandSeparator,
  });

  return (
    <>
      <label className="flex items-center gap-2 border-b border-gray-100 py-2 text-[11px] text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
        <Checkbox
          checked={showMetric}
          onCheckedChange={(checked) => patchLabel({ showMetric: checked === true })}
        />
        指标
      </label>
      {showMetric ? (
        <div className="space-y-0 border-b border-gray-100 pb-2 pl-2 dark:border-white/[0.06]">
          <ChartDeAttrField label="格式类型">
            <Select
              value={metricFormat.type ?? "auto"}
              onValueChange={(formatType) =>
                patchLabel({
                  metricFormatType: formatType as "auto" | "number" | "currency",
                  formatType: undefined,
                })
              }
            >
              <SelectTrigger className={INSPECTOR_SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_FORMAT_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ChartDeAttrField>
          <ChartDeAttrField label="单位语言">
            <Select value="zh" disabled>
              <SelectTrigger className={INSPECTOR_SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </ChartDeAttrField>
          <ChartDeAttrField label="小数位数">
            <Select
              value={String(metricFormat.decimals ?? 0)}
              onValueChange={(v) => patchLabel({ metricDecimals: Number(v), decimals: undefined })}
            >
              <SelectTrigger className={INSPECTOR_SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ChartDeAttrField>
          <ChartDeAttrField label="数量单位">
            <Select
              value={unitSelectValue}
              onValueChange={(v) => {
                if (v === "none") patchLabel({ metricUnit: undefined, unit: undefined });
                else if (v === "千" || v === "万" || v === "亿") patchLabel({ metricUnit: v, unit: undefined });
                else patchLabel({ metricUnit: metricUnit ?? "", unit: undefined });
              }}
            >
              <SelectTrigger className={INSPECTOR_SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                <SelectItem value="千">千</SelectItem>
                <SelectItem value="万">万</SelectItem>
                <SelectItem value="亿">亿</SelectItem>
                <SelectItem value="custom">自定义后缀</SelectItem>
              </SelectContent>
            </Select>
          </ChartDeAttrField>
          {unitSelectValue === "custom" ? (
            <ChartDeAttrField label="单位后缀">
              <Input
                className={CHART_DE_INPUT}
                placeholder="请输入内容"
                value={metricUnit ?? ""}
                onChange={(e) => patchLabel({ metricUnit: e.target.value || undefined, unit: undefined })}
              />
            </ChartDeAttrField>
          ) : null}
          <label className="flex items-center gap-2 py-2 text-[11px] text-gray-600 dark:text-gray-300">
            <Checkbox
              checked={metricFormat.thousandSeparator !== false}
              onCheckedChange={(checked) =>
                patchLabel({ metricThousandSeparator: checked === true, thousandSeparator: undefined })
              }
            />
            千分符
          </label>
          <p className="px-0 py-1 text-[10px] text-gray-400">指标示例：{metricPreview}</p>
        </div>
      ) : null}

      <label className="flex items-center gap-2 border-b border-gray-100 py-2 text-[11px] text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
        <Checkbox
          checked={showRatio}
          onCheckedChange={(checked) => patchLabel({ showRatio: checked === true })}
        />
        占比
      </label>
      {showRatio ? (
        <div className="space-y-0 border-b border-gray-100 pb-2 pl-2 dark:border-white/[0.06]">
          <ChartDeAttrField label="保留小数">
            <Select
              value={String(label?.ratioDecimals ?? 0)}
              onValueChange={(v) => patchLabel({ ratioDecimals: Number(v) })}
            >
              <SelectTrigger className={INSPECTOR_SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATIO_DECIMAL_LABELS.map((name, n) => (
                  <SelectItem key={n} value={String(n)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ChartDeAttrField>
          <p className="px-0 py-1 text-[10px] text-gray-400">占比示例：{ratioPreview}</p>
        </div>
      ) : null}

      <p className={INSPECTOR_HINT}>
        指标显示原值；占比显示「指标÷目标值」。百分比请用占比，勿在指标格式中选百分比。
      </p>
    </>
  );
}
