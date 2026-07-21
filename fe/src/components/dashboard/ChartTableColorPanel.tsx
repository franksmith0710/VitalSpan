import { DashboardConfigSection } from "./DashboardConfigSection";
import { ChartTableColorFields } from "./chartPaletteLabelTooltipFields";
import { useChartInspector } from "./ChartInspectorContext";
import { patchChartDeTableStyle, readChartDeTableStyle } from "@/lib/chartDeTableStyle";
import { isTableLikeChartType } from "@/lib/chartTableInspector";

/** 表格配色（S2 / legacy 明细表） */
export function ChartTableColorPanel() {
  const { cfg, onChange } = useChartInspector();
  if (!isTableLikeChartType(cfg.chartType)) return null;

  const tableStyle = readChartDeTableStyle(cfg);
  return (
    <DashboardConfigSection title="表格配色" compact data-testid="table-style-color">
      <ChartTableColorFields
        compact
        tableStyle={tableStyle}
        onPatch={(patch) => onChange(patchChartDeTableStyle(cfg, patch))}
      />
    </DashboardConfigSection>
  );
}
