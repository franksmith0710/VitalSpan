import { ChartInspectorSection } from "./inspectorCompact";
import { ChartTableColorFields } from "./chartPaletteLabelTooltipFields";
import { useChartInspector } from "./ChartInspectorContext";
import { patchChartDeTableStyle, readChartDeTableStyle, mergeChartTableStyle } from "@/lib/chartDeTableStyle";
import { isTableLikeChartType } from "@/lib/chartTableInspector";

/** 表格配色（S2 / legacy 明细表） */
export function ChartTableColorPanel() {
  const { cfg, onChange, dashboardStyle } = useChartInspector();
  if (!isTableLikeChartType(cfg.chartType)) return null;

  const tableStyle = mergeChartTableStyle(
    readChartDeTableStyle(cfg),
    dashboardStyle?.tableColorStyle,
  );
  return (
    <ChartInspectorSection title="表格配色" data-testid="table-style-color">
      <ChartTableColorFields
        compact
        wrapSection={false}
        tableStyle={tableStyle}
        onPatch={(patch) => onChange(patchChartDeTableStyle(cfg, patch))}
      />
    </ChartInspectorSection>
  );
}
