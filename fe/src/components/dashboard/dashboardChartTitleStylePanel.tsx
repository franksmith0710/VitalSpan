import { ColorField } from "@/components/ui/color-field";
import {
  mergeTitleStyle,
  type TitleStyleConfig,
} from "./dashboardStyleConfig";
import { DashboardConfigSlider } from "./deAttrSlider";
import { DeAttrField, DeAttrToggleRow, DeSegmentGroup } from "./dashboardInspectorUi";
import { HORIZONTAL_ALIGN_SEGMENT_OPTIONS } from "./inspectorSegmentIcons";

const FONT_WEIGHT_OPTIONS = [
  { value: "400", label: "常规" },
  { value: "600", label: "半粗" },
  { value: "700", label: "加粗" },
] as const;

type Props = {
  titleStyle: TitleStyleConfig;
  onPatch: (patch: Partial<TitleStyleConfig>) => void;
};

/** 看板配置 · 图表标题（对标 DE attr 文本/字号/颜色/对齐） */
export function DashboardChartTitleStylePanel({ titleStyle, onPatch }: Props) {
  const ts = titleStyle;
  const previewStyle = mergeTitleStyle(ts, {
    fontSize: ts.fontSize ?? 16,
    color: ts.color,
  });
  const fontWeightValue = String(ts.fontWeight ?? 400);

  return (
    <div className="pb-1" data-testid="dashboard-chart-title-style-body">
      <DeAttrToggleRow
        label="显示标题"
        checked={ts.show !== false}
        onCheckedChange={(show) => onPatch({ show })}
      />
      <DeAttrField label="文本" compact className="border-b-0 py-2">
        <p
          className="truncate rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-2 dark:border-white/[0.06] dark:bg-white/[0.03]"
          style={previewStyle}
          data-testid="dashboard-chart-title-preview"
        >
          标题示例
        </p>
      </DeAttrField>
      <div className="grid grid-cols-2 gap-2 border-b border-gray-100 py-2 dark:border-white/[0.06]">
        <DashboardConfigSlider
          label="字号"
          value={ts.fontSize}
          fallback={16}
          min={10}
          max={48}
          step={1}
          unit="px"
          onChange={(fontSize) => onPatch({ fontSize })}
        />
        <DeAttrField label="颜色" compact className="border-b-0 py-0">
          <ColorField
            compact
            allowClear
            value={ts.color ?? ""}
            onChange={(color) => onPatch({ color: color || undefined })}
          />
        </DeAttrField>
      </div>
      <DeAttrField label="字重" compact className="border-b-0 py-2">
        <DeSegmentGroup
          value={fontWeightValue}
          columns={3}
          sizing="fit"
          options={FONT_WEIGHT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          onChange={(value) => onPatch({ fontWeight: Number(value) })}
        />
      </DeAttrField>
      <DashboardConfigSlider
        label="字间距"
        value={ts.letterSpacing}
        fallback={0}
        min={0}
        max={8}
        step={1}
        unit="px"
        onChange={(letterSpacing) => onPatch({ letterSpacing })}
      />
      <DeAttrField label="对齐" compact className="border-b-0 py-0">
        <DeSegmentGroup
          value={ts.align ?? "left"}
          columns={3}
          sizing="fit"
          options={HORIZONTAL_ALIGN_SEGMENT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          onChange={(align) => onPatch({ align: align as TitleStyleConfig["align"] })}
        />
      </DeAttrField>
      <DeAttrToggleRow
        label="字体阴影"
        checked={ts.shadow ?? false}
        onCheckedChange={(shadow) => onPatch({ shadow })}
      />
    </div>
  );
}
