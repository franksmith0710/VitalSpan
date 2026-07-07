import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { getEchartsTheme } from "@/lib/echarts-theme";
import {
  ADVANCED_CHART_ROW_CAP,
  buildEchartsOption,
  capRows,
  type RenderSpec,
} from "./renderFromSpec";

type Props = {
  spec: RenderSpec;
  rows: unknown[][];
  columns: string[];
  ariaLabel: string;
  isDark?: boolean;
};

export function AdvancedEchartsChart({ spec, rows, columns, ariaLabel, isDark = false }: Props) {
  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );
  const option = useMemo(
    () => buildEchartsOption(spec, capped, columns),
    [spec, capped, columns],
  );
  const theme = useMemo(() => getEchartsTheme(isDark), [isDark]);

  const isEmpty =
    !option ||
    (Array.isArray((option as { series?: unknown[] }).series) &&
      (option as { series?: unknown[] }).series!.length === 0);

  return (
    <div className="min-h-[180px] w-full" aria-label={ariaLabel}>
      {truncated ? (
        <p role="status" className="mb-2 text-theme-xs text-warning-600 dark:text-warning-400">
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条
        </p>
      ) : null}
      {isEmpty ? (
        <div
          className="flex min-h-[180px] items-center justify-center text-theme-xs text-gray-400 dark:text-gray-500"
          role="status"
          aria-label="暂无数据"
        >
          暂无数据
        </div>
      ) : (
        <ReactECharts
          option={option}
          theme={theme}
          style={{ height: 180, width: "100%" }}
          opts={{ renderer: "canvas" }}
          data-testid="echarts-chart"
        />
      )}
    </div>
  );
}
