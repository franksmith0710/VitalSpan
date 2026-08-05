import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMetricValue } from "../dashboardStyleConfig";
import { ChartDeAttrField } from "../chartInspectorDeFields";
import { ChartPaletteFontSizeSelect } from "../chartPaletteShared";
import { INSPECTOR_HINT, INSPECTOR_SELECT } from "../inspectorCompact";
import type { ChartLabelStyle } from "@/lib/chartDeStyle";

const PERCENT_DECIMAL_OPTIONS = [
  { value: "0", label: "整数" },
  { value: "1", label: "一位" },
  { value: "2", label: "两位" },
];

type ChartPieLabelFieldsProps = {
  label: ChartLabelStyle | undefined;
  patchLabel: (patch: Partial<ChartLabelStyle>) => void;
};

/** 饼图标签：内外位置 + 维度/指标/占比（对标 DataEase） */
export function ChartPieLabelFields({ label, patchLabel }: ChartPieLabelFieldsProps) {
  const showIndicator = label?.showIndicator !== false;
  const showPercent = label?.showPercent === true;
  const percentDecimals = label?.percentDecimals ?? label?.ratioDecimals ?? 2;

  return (
    <>
      <ChartDeAttrField label="标签位置">
        <Select
          value={label?.position === "outside" ? "outside" : "inside"}
          onValueChange={(position) =>
            patchLabel({ position: position as "inside" | "outside" })
          }
        >
          <SelectTrigger className={INSPECTOR_SELECT} aria-label="标签位置">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inside">内</SelectItem>
            <SelectItem value="outside">外</SelectItem>
          </SelectContent>
        </Select>
      </ChartDeAttrField>
      <label className="flex items-center gap-2 border-b border-gray-100 py-2 text-[11px] text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
        <Checkbox
          checked={label?.showDimension === true}
          onCheckedChange={(checked) => patchLabel({ showDimension: checked === true })}
        />
        维度
      </label>
      <label className="flex items-center gap-2 border-b border-gray-100 py-2 text-[11px] text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
        <Checkbox
          checked={showIndicator}
          onCheckedChange={(checked) => patchLabel({ showIndicator: checked === true })}
        />
        指标
      </label>
      {showIndicator ? (
        <>
          <ChartDeAttrField label="格式类型">
            <Select
              value={label?.formatType ?? "auto"}
              onValueChange={(formatType) =>
                patchLabel({ formatType: formatType as ChartLabelStyle["formatType"] })
              }
            >
              <SelectTrigger className={INSPECTOR_SELECT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动</SelectItem>
                <SelectItem value="number">数值</SelectItem>
                <SelectItem value="percent">百分比</SelectItem>
                <SelectItem value="currency">货币</SelectItem>
              </SelectContent>
            </Select>
          </ChartDeAttrField>
          <label className="flex items-center gap-2 border-b border-gray-100 py-2 text-[11px] text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
            <Checkbox
              checked={label?.thousandSeparator !== false}
              onCheckedChange={(checked) => patchLabel({ thousandSeparator: checked === true })}
            />
            千分符
          </label>
        </>
      ) : null}
      <label className="flex items-center gap-2 border-b border-gray-100 py-2 text-[11px] text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
        <Checkbox
          checked={showPercent}
          onCheckedChange={(checked) => patchLabel({ showPercent: checked === true })}
        />
        占比
      </label>
      {showPercent ? (
        <ChartDeAttrField label="保留小数">
          <Select
            value={String(percentDecimals)}
            onValueChange={(v) => patchLabel({ percentDecimals: Number(v) })}
          >
            <SelectTrigger className={INSPECTOR_SELECT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERCENT_DECIMAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ChartDeAttrField>
      ) : null}
      <p className={INSPECTOR_HINT}>
        示例：
        {formatMetricValue(1234567.89, {
          type: label?.formatType ?? "auto",
          decimals: 2,
          thousandSeparator: label?.thousandSeparator !== false,
        })}
      </p>
    </>
  );
}
