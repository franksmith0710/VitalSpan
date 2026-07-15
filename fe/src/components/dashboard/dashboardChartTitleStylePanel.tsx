import { ColorField } from "@/components/ui/color-field";
import { TEXT_COLOR_RECOMMENDED, type TitleStyleConfig } from "./dashboardStyleConfig";
import { DeTitleStyleToolbar } from "./deTitleStyleToolbar";
import { DeAttrField, DeAttrToggleRow } from "./dashboardInspectorUi";

type Props = {
  titleStyle: TitleStyleConfig;
  onPatch: (patch: Partial<TitleStyleConfig>) => void;
};

/** 看板配置 · 图表标题（对标 DE 文本工具条 + 字体色） */
export function DashboardChartTitleStylePanel({ titleStyle, onPatch }: Props) {
  const ts = titleStyle;

  return (
    <div className="pb-1" data-testid="dashboard-chart-title-style-body">
      <DeAttrToggleRow
        label="显示标题"
        checked={ts.show !== false}
        onCheckedChange={(show) => onPatch({ show })}
      />
      <DeAttrField label="文本" compact className="border-b-0 py-2">
        <DeTitleStyleToolbar value={ts} onChange={onPatch} defaultFontSize={16} />
      </DeAttrField>
      <DeAttrField label="字体色" compact className="border-b-0 py-2">
        <ColorField
          compact
          allowClear
          swatches={TEXT_COLOR_RECOMMENDED}
          value={ts.color ?? ""}
          onChange={(color) => onPatch({ color: color || undefined })}
        />
      </DeAttrField>
    </div>
  );
}
