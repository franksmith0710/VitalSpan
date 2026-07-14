import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { useChartInspector } from "./ChartInspectorContext";

type DeDisplayOptions = {
  refreshMode?: string;
  resultLimit?: string;
};

const REFRESH_OPTIONS = [
  { value: "off", label: "关闭" },
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

function readDisplayOptions(cfg: ChartViewConfig): DeDisplayOptions {
  const raw = cfg.nativeBody?.deDisplay;
  if (!raw || typeof raw !== "object") return { refreshMode: "off", resultLimit: "all" };
  const d = raw as DeDisplayOptions;
  return {
    refreshMode: d.refreshMode ?? "off",
    resultLimit: d.resultLimit ?? "all",
  };
}

function patchDisplayOptions(cfg: ChartViewConfig, patch: Partial<DeDisplayOptions>): ChartViewConfig {
  const prev = readDisplayOptions(cfg);
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deDisplay: { ...prev, ...patch },
    },
  };
}

/** DataEase 数据 Tab：刷新频率 + 结果展示 */
export function ChartDataOptions() {
  const { cfg, onChange } = useChartInspector();
  const display = readDisplayOptions(cfg);

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
      <div className="grid gap-1.5">
        <Label className="text-theme-xs text-gray-500">刷新频率</Label>
        <Select
          value={display.refreshMode ?? "off"}
          onValueChange={(value) => onChange(patchDisplayOptions(cfg, { refreshMode: value }))}
        >
          <SelectTrigger className="h-9 text-theme-xs" aria-label="刷新频率">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFRESH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">编辑页不生效，公共链接预览时启用</p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-theme-xs text-gray-500">结果展示</Label>
        <Select
          value={display.resultLimit ?? "all"}
          onValueChange={(value) => onChange(patchDisplayOptions(cfg, { resultLimit: value }))}
        >
          <SelectTrigger className="h-9 text-theme-xs" aria-label="结果展示">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESULT_LIMIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
