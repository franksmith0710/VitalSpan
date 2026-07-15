import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  patchChartDeDisplay,
  readChartDeDisplay,
} from "@/lib/chartDeDisplay";
import { useChartInspector } from "./ChartInspectorContext";
import { DE_SELECT, DeAttrField, DeAttrForm } from "./dashboardInspectorUi";

const REFRESH_OPTIONS = [
  { value: "off", label: "请选择" },
  { value: "30s", label: "30 秒" },
  { value: "1m", label: "1 分钟" },
  { value: "5m", label: "5 分钟" },
  { value: "15m", label: "15 分钟" },
] as const;

const RESULT_LIMIT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "100", label: "100" },
  { value: "500", label: "500" },
  { value: "1000", label: "1000" },
  { value: "10000", label: "10000" },
] as const;

/** DataEase 数据 Tab：刷新频率 + 结果展示 */
export function ChartDataOptions() {
  const { cfg, onChange } = useChartInspector();
  const display = readChartDeDisplay(cfg);

  return (
    <DeAttrForm className="border-t border-gray-100 pt-1 dark:border-white/[0.06]">
      <DeAttrField label="刷新频率" compact hint="本组件轮询">
        <Select
          value={display.refreshMode ?? "off"}
          onValueChange={(value) => onChange(patchChartDeDisplay(cfg, { refreshMode: value }))}
        >
          <SelectTrigger className={DE_SELECT} aria-label="刷新频率">
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            {REFRESH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DeAttrField>
      <DeAttrField label="结果展示" compact>
        <Select
          value={display.resultLimit ?? "all"}
          onValueChange={(value) => onChange(patchChartDeDisplay(cfg, { resultLimit: value }))}
        >
          <SelectTrigger className={DE_SELECT} aria-label="结果展示">
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            {RESULT_LIMIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DeAttrField>
    </DeAttrForm>
  );
}
