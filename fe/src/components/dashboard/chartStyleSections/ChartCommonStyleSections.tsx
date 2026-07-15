import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorField } from "@/components/ui/color-field";
import { CHART_PALETTE_PRESETS } from "@/lib/chartPalette";
import { formatMetricValue } from "../dashboardStyleConfig";
import { DashboardConfigSection } from "../DashboardConfigSection";
import { ChartBackgroundStyleFields } from "../chartStyleFields";
import { ChartDeAttrField, ChartDeSegmentField, CHART_DE_INPUT } from "../chartInspectorDeFields";
import { ChartDeSliderField } from "../deAttrSlider";
import { DeAttrToggleRow } from "../dashboardInspectorUi";
import { INSPECTOR_CTRL, INSPECTOR_SELECT } from "../inspectorCompact";
import { useChartInspector } from "../ChartInspectorContext";
import {
  patchChartDeStyle,
  patchChartDeStyleNested,
  patchChartShowLabel,
  readChartDeStyle,
  readChartShowLabel,
} from "@/lib/chartDeStyle";
import { chartInspectorCapabilities } from "@/lib/chartInspectorCapabilities";

const LEGEND_POSITIONS = [
  { value: "top", label: "上" },
  { value: "bottom", label: "下" },
  { value: "left", label: "左" },
  { value: "right", label: "右" },
] as const;

const BORDER_STYLES = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
  { value: "dotted", label: "点线" },
] as const;

export function ChartPaletteStyleSection() {
  const { cfg, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);

  return (
    <DashboardConfigSection title="配色方案" defaultOpen compact>
      <ChartDeAttrField label="图表配色">
        <Select
          value={deStyle.paletteId ?? "inherit"}
          onValueChange={(paletteId) =>
            onChange(
              patchChartDeStyle(cfg, {
                paletteId: paletteId === "inherit" ? undefined : paletteId,
              }),
            )
          }
        >
          <SelectTrigger className={INSPECTOR_SELECT} aria-label="配色方案">
            <SelectValue placeholder="跟随看板" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">跟随看板</SelectItem>
            {Object.keys(CHART_PALETTE_PRESETS).map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ChartDeAttrField>
      <ChartDeSliderField
        label="配色不透明度 %"
        value={
          deStyle.paletteOpacity != null ? Math.round(deStyle.paletteOpacity * 100) : undefined
        }
        fallback={100}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(opacity) =>
          onChange(patchChartDeStyle(cfg, { paletteOpacity: opacity / 100 }))
        }
      />
    </DashboardConfigSection>
  );
}

export function ChartTitleStyleSection() {
  const { widget, cfg, onChange, onTitleChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const patchTitle = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "title", patch));

  return (
    <DashboardConfigSection title="标题" defaultOpen compact>
      <div className="pb-1">
        <DeAttrToggleRow
          label="显示标题"
          checked={deStyle.title?.show !== false}
          onCheckedChange={(show) => patchTitle({ show })}
        />
        <ChartDeAttrField label="文本">
          <Input
            className={CHART_DE_INPUT}
            value={widget.title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            aria-label="标题文本"
          />
        </ChartDeAttrField>
        <div className="grid grid-cols-2 gap-2 border-b border-gray-100 py-2 dark:border-white/[0.06]">
          <ChartDeSliderField
            label="字号"
            className="border-b-0 py-0"
            value={deStyle.title?.fontSize}
            fallback={18}
            min={10}
            max={48}
            step={1}
            unit="px"
            onChange={(fontSize) => patchTitle({ fontSize })}
          />
          <ChartDeAttrField label="颜色" className="border-b-0 py-0">
            <ColorField
              compact
              value={deStyle.title?.color ?? ""}
              onChange={(color) => patchTitle({ color: color || undefined })}
            />
          </ChartDeAttrField>
        </div>
        <ChartDeSegmentField
          label="对齐"
          value={deStyle.title?.align ?? "left"}
          columns={3}
          options={[
            { value: "left", label: "左" },
            { value: "center", label: "中" },
            { value: "right", label: "右" },
          ]}
          onChange={(align) => patchTitle({ align: align as "left" | "center" | "right" })}
        />
        <DeAttrToggleRow
          label="字体阴影"
          checked={deStyle.title?.shadow ?? false}
          onCheckedChange={(shadow) => patchTitle({ shadow })}
        />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartRemarkStyleSection() {
  const { cfg, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const patchRemark = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "remark", patch));

  return (
    <DashboardConfigSection title="备注" defaultOpen={false} compact>
      <div className="pb-1">
        <DeAttrToggleRow
          label="显示备注"
          checked={deStyle.remark?.show ?? false}
          onCheckedChange={(show) => patchRemark({ show })}
        />
        <ChartDeAttrField label="备注内容">
          <Input
            className={CHART_DE_INPUT}
            value={deStyle.remark?.text ?? ""}
            placeholder="图表说明…"
            onChange={(e) => patchRemark({ text: e.target.value })}
          />
        </ChartDeAttrField>
      </div>
    </DashboardConfigSection>
  );
}

export function ChartLegendStyleSection() {
  const { cfg, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const patchLegend = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "legend", patch));

  return (
    <DashboardConfigSection title="图例" defaultOpen compact>
      <div className="pb-1">
        <DeAttrToggleRow
          label="显示图例"
          checked={deStyle.legend?.show !== false}
          onCheckedChange={(show) => patchLegend({ show })}
        />
        <ChartDeSliderField
          label="字号"
          value={deStyle.legend?.fontSize}
          fallback={12}
          min={10}
          max={24}
          step={1}
          unit="px"
          onChange={(fontSize) => patchLegend({ fontSize })}
        />
        <ChartDeSegmentField
          label="位置"
          value={deStyle.legend?.position ?? "bottom"}
          columns={2}
          options={LEGEND_POSITIONS.map((p) => ({ value: p.value, label: p.label }))}
          onChange={(position) =>
            patchLegend({ position: position as "top" | "bottom" | "left" | "right" })
          }
        />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartLabelStyleSection() {
  const { cfg, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const caps = chartInspectorCapabilities(cfg.chartType);
  const showLabel = readChartShowLabel(cfg);
  const patchLabel = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "label", patch));
  const isKpi = cfg.chartType === "kpi";

  return (
    <DashboardConfigSection title={isKpi ? "指标格式" : "标签"} defaultOpen compact>
      <div className="pb-1">
        {!isKpi ? (
          <DeAttrToggleRow
            label="显示数据标签"
            checked={showLabel}
            onCheckedChange={(show) => onChange(patchChartShowLabel(cfg, show))}
          />
        ) : null}
        {!isKpi ? (
          <ChartDeSliderField
            label="字号"
            value={deStyle.label?.fontSize}
            fallback={12}
            min={10}
            max={24}
            step={1}
            unit="px"
            onChange={(fontSize) => patchLabel({ fontSize })}
          />
        ) : null}
        <ChartDeAttrField label="格式类型">
          <Select
            value={deStyle.label?.formatType ?? "auto"}
            disabled={!caps.labelFormat}
            onValueChange={(formatType) =>
              patchLabel({ formatType: formatType as "auto" | "number" | "percent" | "currency" })
            }
          >
            <SelectTrigger className={INSPECTOR_SELECT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动</SelectItem>
              <SelectItem value="number">数值</SelectItem>
              <SelectItem value="percent">百分比</SelectItem>
              <SelectItem value="currency">货币</SelectItem>
            </SelectContent>
          </Select>
        </ChartDeAttrField>
        <label className="flex items-center gap-2 border-b border-gray-100 py-2 text-[11px] text-gray-600 last:border-b-0 dark:border-white/[0.06] dark:text-gray-300">
          <Checkbox
            checked={deStyle.label?.thousandSeparator !== false}
            disabled={!caps.labelFormat}
            onCheckedChange={(checked) => patchLabel({ thousandSeparator: checked === true })}
          />
          千分符
        </label>
        {caps.labelFormat ? (
          <p className="px-0 py-1 text-[10px] text-gray-400">
            示例：
            {formatMetricValue(1234567.89, {
              type: deStyle.label?.formatType ?? "auto",
              decimals: 2,
              thousandSeparator: deStyle.label?.thousandSeparator !== false,
            })}
          </p>
        ) : null}
      </div>
    </DashboardConfigSection>
  );
}

export function ChartBackgroundStyleSection() {
  const { cfg, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const patchBackground = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "background", patch));

  return (
    <DashboardConfigSection title="背景" defaultOpen={false} compact>
      <ChartBackgroundStyleFields
        value={deStyle.background ?? {}}
        onChange={(patch) => patchBackground(patch)}
      />
    </DashboardConfigSection>
  );
}

export function ChartBorderStyleSection() {
  const { cfg, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const patchBorder = (patch: Parameters<typeof patchChartDeStyleNested>[2]) =>
    onChange(patchChartDeStyleNested(cfg, "border", patch));

  return (
    <DashboardConfigSection title="边框" defaultOpen={false} compact>
      <div className="pb-1">
        <DeAttrToggleRow
          label="显示边框"
          checked={deStyle.border?.show ?? false}
          onCheckedChange={(show) => patchBorder({ show })}
        />
        <ChartDeAttrField label="颜色">
          <ColorField
            compact
            value={deStyle.border?.color ?? ""}
            onChange={(color) => patchBorder({ color: color || undefined })}
          />
        </ChartDeAttrField>
        <div className="grid grid-cols-2 gap-2 border-b border-gray-100 py-2 dark:border-white/[0.06]">
          <ChartDeSliderField
            label="线宽"
            className="border-b-0 py-0"
            value={deStyle.border?.width}
            fallback={1}
            min={0}
            max={8}
            step={1}
            unit="px"
            onChange={(width) => patchBorder({ width })}
          />
          <ChartDeSliderField
            label="圆角"
            className="border-b-0 py-0"
            value={deStyle.border?.radius}
            fallback={0}
            min={0}
            max={32}
            step={1}
            unit="px"
            onChange={(radius) => patchBorder({ radius })}
          />
        </div>
        <ChartDeSegmentField
          label="样式"
          value={deStyle.border?.style ?? "solid"}
          columns={3}
          options={BORDER_STYLES.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(style) => patchBorder({ style: style as "solid" | "dashed" | "dotted" })}
        />
      </div>
    </DashboardConfigSection>
  );
}
