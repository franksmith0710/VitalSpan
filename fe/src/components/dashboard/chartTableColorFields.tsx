import { WIDGET_BORDER_RECOMMENDED } from "./dashboardStyleConfig";
import { InspectorInlineColorRow } from "./inspectorCompact";
import { useChartInspector } from "./ChartInspectorContext";
import { patchChartDeTableStyle, readChartDeTableStyle } from "@/lib/chartDeTableStyle";

/** 表格配色行（嵌入图表配色区块） */
export function ChartTableColorFields() {
  const { cfg, onChange } = useChartInspector();
  const tableStyle = readChartDeTableStyle(cfg);

  const patch = (next: Parameters<typeof patchChartDeTableStyle>[1]) =>
    onChange(patchChartDeTableStyle(cfg, next));

  return (
    <div className="space-y-0 pb-1">
      <InspectorInlineColorRow
        label="表头背景"
        allowClear
        swatches={WIDGET_BORDER_RECOMMENDED}
        value={tableStyle.headerBg ?? ""}
        onChange={(headerBg) => patch({ headerBg: headerBg || undefined })}
      />
      <InspectorInlineColorRow
        label="表头文字"
        allowClear
        swatches={WIDGET_BORDER_RECOMMENDED}
        value={tableStyle.headerFg ?? ""}
        onChange={(headerFg) => patch({ headerFg: headerFg || undefined })}
      />
      <InspectorInlineColorRow
        label="单元格背景"
        allowClear
        swatches={WIDGET_BORDER_RECOMMENDED}
        value={tableStyle.bodyBg ?? ""}
        onChange={(bodyBg) => patch({ bodyBg: bodyBg || undefined })}
      />
      <InspectorInlineColorRow
        label="单元格文字"
        allowClear
        swatches={WIDGET_BORDER_RECOMMENDED}
        value={tableStyle.bodyFg ?? ""}
        onChange={(bodyFg) => patch({ bodyFg: bodyFg || undefined })}
      />
      <InspectorInlineColorRow
        label="汇总行背景"
        allowClear
        swatches={WIDGET_BORDER_RECOMMENDED}
        value={tableStyle.summaryBg ?? ""}
        onChange={(summaryBg) => patch({ summaryBg: summaryBg || undefined })}
      />
      <InspectorInlineColorRow
        label="汇总行文字"
        allowClear
        swatches={WIDGET_BORDER_RECOMMENDED}
        value={tableStyle.summaryFg ?? ""}
        onChange={(summaryFg) => patch({ summaryFg: summaryFg || undefined })}
      />
    </div>
  );
}
