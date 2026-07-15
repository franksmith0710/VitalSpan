import { ColorField } from "@/components/ui/color-field";
import { WIDGET_BORDER_RECOMMENDED } from "./dashboardStyleConfig";
import { DashboardConfigSection } from "./DashboardConfigSection";
import { ChartDeAttrField } from "./chartInspectorDeFields";
import { useChartInspector } from "./ChartInspectorContext";
import { patchChartDeTableStyle, readChartDeTableStyle } from "@/lib/chartDeTableStyle";

/** DataEase 明细表 · 样式 Tab「表格配色」折叠 */
export function ChartTableColorPanel() {
  const { cfg, onChange } = useChartInspector();
  const tableStyle = readChartDeTableStyle(cfg);

  const patch = (next: Parameters<typeof patchChartDeTableStyle>[1]) =>
    onChange(patchChartDeTableStyle(cfg, next));

  return (
    <DashboardConfigSection title="表格配色" defaultOpen compact data-testid="table-style-color">
      <div className="pb-1">
        <ChartDeAttrField label="表头背景">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.headerBg ?? ""}
            onChange={(headerBg) => patch({ headerBg: headerBg || undefined })}
          />
        </ChartDeAttrField>

        <ChartDeAttrField label="表头文字">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.headerFg ?? ""}
            onChange={(headerFg) => patch({ headerFg: headerFg || undefined })}
          />
        </ChartDeAttrField>

        <ChartDeAttrField label="单元格背景">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.bodyBg ?? ""}
            onChange={(bodyBg) => patch({ bodyBg: bodyBg || undefined })}
          />
        </ChartDeAttrField>

        <ChartDeAttrField label="单元格文字">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.bodyFg ?? ""}
            onChange={(bodyFg) => patch({ bodyFg: bodyFg || undefined })}
          />
        </ChartDeAttrField>

        <ChartDeAttrField label="汇总行背景">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.summaryBg ?? ""}
            onChange={(summaryBg) => patch({ summaryBg: summaryBg || undefined })}
          />
        </ChartDeAttrField>

        <ChartDeAttrField label="汇总行文字">
          <ColorField
            compact
            allowClear
            swatches={WIDGET_BORDER_RECOMMENDED}
            value={tableStyle.summaryFg ?? ""}
            onChange={(summaryFg) => patch({ summaryFg: summaryFg || undefined })}
          />
        </ChartDeAttrField>
      </div>
    </DashboardConfigSection>
  );
}
