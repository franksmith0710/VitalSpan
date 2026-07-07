import type { ChartTimeRangePreset, ChartTimeRangeRef } from "@/lib/chartViewConfig";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESETS: { value: ChartTimeRangePreset; label: string }[] = [
  { value: "last_7d", label: "近 7 天" },
  { value: "last_30d", label: "近 30 天" },
  { value: "last_90d", label: "近 90 天" },
  { value: "mtd", label: "本月至今" },
  { value: "ytd", label: "本年至今" },
];

type Props = {
  value?: ChartTimeRangeRef;
  columns: string[];
  disabled?: boolean;
  onChange: (next: ChartTimeRangeRef | undefined) => void;
};

const DEFAULT_RANGE: ChartTimeRangeRef = {
  enabled: true,
  mode: "relative",
  relativePreset: "last_7d",
};

export function TimeRangeConfig({ value, columns, disabled, onChange }: Props) {
  const tr = value ?? { enabled: false, mode: "relative", relativePreset: "last_7d" };

  const patch = (p: Partial<ChartTimeRangeRef>) => {
    onChange({ ...tr, ...p });
  };

  const toggleEnabled = (checked: boolean) => {
    if (!checked) {
      onChange({ ...tr, enabled: false });
      return;
    }
    onChange({ ...DEFAULT_RANGE, ...tr, enabled: true });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="time-range-enabled">时间范围</Label>
        <Switch
          id="time-range-enabled"
          checked={tr.enabled}
          onCheckedChange={toggleEnabled}
          disabled={disabled}
          aria-label="启用时间范围筛选"
        />
      </div>
      {tr.enabled ? (
        <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
          <div className="space-y-2">
            <Label>模式</Label>
            <Select
              value={tr.mode}
              onValueChange={(v) => patch({ mode: v as ChartTimeRangeRef["mode"] })}
              disabled={disabled}
            >
              <SelectTrigger className="h-11 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relative">相对</SelectItem>
                <SelectItem value="absolute">绝对</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tr.mode === "relative" ? (
            <div className="space-y-2">
              <Label>预设</Label>
              <Select
                value={tr.relativePreset ?? "last_7d"}
                onValueChange={(v) => patch({ relativePreset: v as ChartTimeRangePreset })}
                disabled={disabled}
              >
                <SelectTrigger className="h-11 rounded-lg" aria-label="时间范围预设">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="time-start">开始日期</Label>
                <Input
                  id="time-start"
                  type="date"
                  className="h-11 rounded-lg"
                  value={tr.start ?? ""}
                  onChange={(e) => patch({ start: e.target.value })}
                  disabled={disabled}
                  aria-label="时间范围开始日期"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-end">结束日期</Label>
                <Input
                  id="time-end"
                  type="date"
                  className="h-11 rounded-lg"
                  value={tr.end ?? ""}
                  onChange={(e) => patch({ end: e.target.value })}
                  disabled={disabled}
                  aria-label="时间范围结束日期"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>时间字段（可选）</Label>
            <Select
              value={tr.field ?? "__auto__"}
              onValueChange={(v) => patch({ field: v === "__auto__" ? undefined : v })}
              disabled={disabled}
            >
              <SelectTrigger className="h-11 rounded-lg">
                <SelectValue placeholder="自动" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">自动</SelectItem>
                {columns.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-theme-xs text-gray-500">SQL 模式将注入 time_start/time_end 命名参数</p>
        </div>
      ) : (
        <p className="text-theme-xs text-gray-500">启用后可配置相对或绝对时间范围</p>
      )}
    </div>
  );
}
