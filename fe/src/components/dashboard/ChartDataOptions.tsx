import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildCustomRefreshFromParts,
  buildCustomRefreshMode,
  CHART_REFRESH_PRESET_OPTIONS,
  CHART_RESULT_LIMIT_OPTIONS,
  CUSTOM_REFRESH_UNIT_OPTIONS,
  customRefreshAmountBounds,
  formatChartRefreshSelectValue,
  isCustomRefreshMode,
  parseCustomRefreshParts,
  patchChartDeDisplay,
  parseCustomRefreshSec,
  readChartDeDisplay,
  splitCustomRefreshSec,
  type CustomRefreshUnit,
} from "@/lib/chartDeDisplay";
import { useChartInspector } from "./chartInspectorContext";
import { DE_SELECT, DeAttrField, DeAttrForm } from "./dashboardInspectorUi";
import { cn } from "@/lib/utils";

const LIMIT_PRESETS = ["100", "500", "1000", "10000"] as const;

/** DataEase 数据 Tab：刷新频率 + 结果展示 */
export function ChartDataOptions() {
  const { cfg, onChange } = useChartInspector();
  const display = readChartDeDisplay(cfg);
  const refreshMode = display.refreshMode ?? "off";
  const refreshOn = refreshMode !== "off";
  const refreshSelect = formatChartRefreshSelectValue(refreshMode);
  const customRefresh = parseCustomRefreshParts(refreshMode);
  const isCustom = refreshSelect === "custom" || isCustomRefreshMode(refreshMode);
  const customBounds = customRefreshAmountBounds(customRefresh.unit);
  const resultLimit = display.resultLimit ?? "1000";
  const isAll = resultLimit === "all";

  const setRefreshMode = (mode: string) => {
    onChange(patchChartDeDisplay(cfg, { refreshMode: mode }));
  };

  const setCustomParts = (amount: number, unit: CustomRefreshUnit) => {
    setRefreshMode(buildCustomRefreshFromParts(amount, unit));
  };

  return (
    <DeAttrForm className="border-t border-gray-100 pt-1 dark:border-white/[0.06]">
      <DeAttrField label="刷新频率" compact>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`chart-refresh-${cfg.chartType}`}
              checked={refreshOn}
              onCheckedChange={(checked) =>
                setRefreshMode(checked === true ? "30s" : "off")
              }
              aria-label="启用刷新频率"
            />
            {refreshOn ? (
              <Select
                value={refreshSelect}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setRefreshMode(buildCustomRefreshMode(60));
                    return;
                  }
                  setRefreshMode(value);
                }}
              >
                <SelectTrigger
                  className={cn(DE_SELECT, "h-8 min-w-0 flex-1")}
                  aria-label="刷新间隔"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_REFRESH_PRESET_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">未开启</span>
            )}
          </div>
          {refreshOn && isCustom ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={customBounds.min}
                max={customBounds.max}
                value={customRefresh.amount}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  if (!Number.isFinite(next)) return;
                  setCustomParts(next, customRefresh.unit);
                }}
                className={cn(DE_SELECT, "h-8 min-w-0 flex-1 px-2")}
                aria-label="自定义刷新间隔"
              />
              <Select
                value={customRefresh.unit}
                onValueChange={(unit) => {
                  const nextUnit = unit as CustomRefreshUnit;
                  const sec = parseCustomRefreshSec(refreshMode, 60);
                  const { amount } = splitCustomRefreshSec(sec, nextUnit);
                  setCustomParts(amount, nextUnit);
                }}
              >
                <SelectTrigger
                  className={cn(DE_SELECT, "h-8 w-[3.75rem] shrink-0 px-2")}
                  aria-label="刷新间隔单位"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_REFRESH_UNIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </DeAttrField>
      <DeAttrField label="结果展示" compact>
        <div className="flex flex-wrap items-center gap-3 text-theme-xs text-gray-700 dark:text-gray-300">
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name={`result-limit-${cfg.chartType}`}
              className="size-3.5 accent-brand-500"
              checked={isAll}
              onChange={() => onChange(patchChartDeDisplay(cfg, { resultLimit: "all" }))}
            />
            全部
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name={`result-limit-${cfg.chartType}`}
              className="size-3.5 accent-brand-500"
              checked={!isAll}
              onChange={() =>
                onChange(
                  patchChartDeDisplay(cfg, {
                    resultLimit: LIMIT_PRESETS.includes(
                      resultLimit as (typeof LIMIT_PRESETS)[number],
                    )
                      ? resultLimit
                      : "1000",
                  }),
                )
              }
            />
            <Select
              value={isAll ? "1000" : resultLimit}
              onValueChange={(value) => onChange(patchChartDeDisplay(cfg, { resultLimit: value }))}
              disabled={isAll}
            >
              <SelectTrigger className={cn(DE_SELECT, "h-8 w-[4.5rem] px-2")} aria-label="结果条数">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_RESULT_LIMIT_OPTIONS.filter((opt) => opt.value !== "all").map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </DeAttrField>
    </DeAttrForm>
  );
}
