import { useMemo, useRef } from "react";
import { ChartEngineView } from "@/components/charts/engine/ChartEngineView";
import { buildChartViewModel } from "@/components/charts/engine/buildChartViewModel";
import { buildStyleContext } from "@/components/charts/engine/buildStyleContext";
import { useDashboardColorScheme } from "@/hooks/useDashboardColorScheme";
import { resolveEffectivePaletteColors } from "@/lib/chartDeStyle";
import type { AnalysisTheme, FieldMapping } from "../useStandardAnalysis";
import { buildStandardSectionChartConfig } from "../standardAnalysisPresentation";

type Props = {
  theme: AnalysisTheme;
  headers: string[];
  rows: unknown[][];
  chartType: "bar" | "line";
  fieldMapping?: FieldMapping;
};

export function StandardAnalysisSectionChart({ theme, headers, rows, chartType, fieldMapping }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scheme = useDashboardColorScheme(containerRef);

  const config = useMemo(
    () => buildStandardSectionChartConfig(headers, chartType, fieldMapping, theme),
    [headers, chartType, fieldMapping, theme],
  );

  const viewModel = useMemo(
    () =>
      buildChartViewModel(config, {
        columns: headers,
        rows: rows as (string | number | boolean | null)[][],
      }),
    [config, headers, rows],
  );

  const style = useMemo(
    () =>
      buildStyleContext({
        config,
        scheme,
        chartColors: resolveEffectivePaletteColors(config, "default"),
        embedEdit: false,
      }),
    [config, scheme],
  );

  const ariaLabel = useMemo(() => {
    const labels: Record<AnalysisTheme, string> = {
      distribution: "区域分布图表",
      activity: "活跃度趋势图表",
      trend: "趋势图表",
      lifecycle: "生命周期图表",
    };
    return labels[theme];
  }, [theme]);

  return (
    <div ref={containerRef} className="min-h-[320px] w-full pt-2 pb-2">
      <div className="relative h-[min(420px,50vh)] min-h-[280px] w-full">
        <ChartEngineView
          viewModel={viewModel}
          style={style}
          chartConfig={config}
          ariaLabel={ariaLabel}
          fill
          height={320}
        />
      </div>
    </div>
  );
}
