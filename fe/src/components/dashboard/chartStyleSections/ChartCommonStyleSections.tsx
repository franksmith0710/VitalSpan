import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { TEXT_COLOR_RECOMMENDED } from "@/components/dashboard/dashboardStyleConfig";
import { formatMetricValue } from "../dashboardStyleConfig";
import { ChartBackgroundStyleFields } from "../chartStyleFields";
import { ChartDeAttrField, ChartDeSegmentField, CHART_DE_INPUT } from "../chartInspectorDeFields";
import { ChartDeSliderField } from "../deAttrSlider";
import { ChartPaletteDeParityFields } from "../chartPaletteDeParityFields";
import { ChartTableColorFields } from "../chartTableColorFields";
import { useChartInspector } from "../chartInspectorContext";
import {
  patchChartShowLabel,
  readChartDeStyle,
  readChartLegendPosition,
  readChartLegendVisible,
  readChartShowLabel,
  readChartTitleVisible,
  readChartTooltipShow,
  type ChartDeStyle,
} from "@/lib/chartDeStyle";
import type { WidgetStyleConfig } from "../dashboardStyleConfig";
import { chartInspectorCapabilities } from "@/lib/chartInspectorCapabilities";
import { LEGEND_POSITION_SEGMENT_OPTIONS } from "../inspectorSegmentIcons";
import { ChartInspectorSection, INSPECTOR_SELECT, InspectorInlineColorRow } from "../inspectorCompact";
import { DeTitleStyleToolbar } from "../deTitleStyleToolbar";

export function ChartPaletteStyleSection() {
  const { cfg, patchDeStyle, patchDeStyleNested, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const caps = chartInspectorCapabilities(cfg.chartType);
  const isTable = cfg.chartType === "table";

  const patchPaletteOpacity = (opacityPercent: number) =>
    patchDeStyle({ paletteOpacity: opacityPercent / 100 });

  return (
    <ChartInspectorSection title="图表配色" defaultOpen>
      <ChartPaletteDeParityFields
        dense
        showInherit
        paletteId={deStyle.paletteId}
        paletteOpacity={deStyle.paletteOpacity}
        seriesGradient={deStyle.seriesGradient ?? false}
        labelShow={readChartShowLabel(cfg)}
        tooltipShow={readChartTooltipShow(cfg)}
        showLabelToggle={caps.label}
        showTooltipToggle={!isTable}
        showGradientToggle={!isTable}
        onPaletteChange={(paletteId) =>
          patchDeStyle({
            paletteId,
            ...(paletteId === undefined ? { paletteOpacity: undefined } : {}),
          })
        }
        onOpacityChange={patchPaletteOpacity}
        onOpacityPreview={patchPaletteOpacity}
        onSeriesGradientChange={(enabled) => patchDeStyle({ seriesGradient: enabled })}
        onLabelShowChange={(show) => onChange(patchChartShowLabel(cfg, show))}
        onTooltipShowChange={(show) => patchDeStyleNested("tooltip", { show })}
        tableColorSlot={isTable ? <ChartTableColorFields /> : undefined}
      />
    </ChartInspectorSection>
  );
}

export function ChartTitleStyleSection() {
  const { widget, cfg, patchDeStyleNested, onTitleChange, dashboardStyle } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const titleVisible = readChartTitleVisible(cfg, dashboardStyle?.titleStyle);
  const patchTitle = (patch: Partial<NonNullable<ChartDeStyle["title"]>>) =>
    patchDeStyleNested("title", patch);

  return (
    <ChartInspectorSection
      title="标题"
      defaultOpen
      action={
        <Switch
          checked={titleVisible}
          onCheckedChange={(show) => patchTitle({ show })}
          aria-label="显示标题"
          className="scale-90"
        />
      }
    >
      <ChartDeAttrField label="文本">
        <div className="space-y-2">
          <Input
            className={CHART_DE_INPUT}
            value={widget.title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            aria-label="标题文本"
          />
          <DeTitleStyleToolbar
            value={deStyle.title ?? {}}
            onChange={patchTitle}
            defaultFontSize={18}
          />
        </div>
      </ChartDeAttrField>
      <InspectorInlineColorRow
        label="字体色"
        swatches={TEXT_COLOR_RECOMMENDED}
        value={deStyle.title?.color ?? ""}
        onChange={(color) => patchTitle({ color: color || undefined })}
      />
    </ChartInspectorSection>
  );
}

export function ChartRemarkStyleSection() {
  const { cfg, patchDeStyleNested } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const patchRemark = (patch: Partial<NonNullable<ChartDeStyle["remark"]>>) =>
    patchDeStyleNested("remark", patch);

  return (
    <ChartInspectorSection
      title="备注"
      action={
        <Switch
          checked={deStyle.remark?.show ?? false}
          onCheckedChange={(show) => patchRemark({ show })}
          aria-label="显示备注"
          className="scale-90"
        />
      }
    >
      <ChartDeAttrField label="备注内容">
        <Input
          className={CHART_DE_INPUT}
          value={deStyle.remark?.text ?? ""}
          placeholder="图表说明…"
          onChange={(e) => patchRemark({ text: e.target.value })}
        />
      </ChartDeAttrField>
    </ChartInspectorSection>
  );
}

export function ChartLegendStyleSection() {
  const { cfg, patchDeStyleNested } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const legendVisible = readChartLegendVisible(deStyle, { embedded: true });
  const patchLegend = (patch: Partial<NonNullable<ChartDeStyle["legend"]>>) =>
    patchDeStyleNested("legend", patch);

  return (
    <ChartInspectorSection
      title="图例"
      defaultOpen
      action={
        <Switch
          checked={legendVisible}
          onCheckedChange={(show) => patchLegend({ show })}
          aria-label="显示图例"
          className="scale-90"
        />
      }
    >
      {legendVisible ? (
        <>
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
            value={readChartLegendPosition(deStyle)}
            columns={4}
            options={LEGEND_POSITION_SEGMENT_OPTIONS}
            onChange={(position) =>
              patchLegend({ position: position as "top" | "bottom" | "left" | "right" })
            }
          />
        </>
      ) : null}
    </ChartInspectorSection>
  );
}

export function ChartLabelStyleSection() {
  const { cfg, mutateChartConfig, patchDeStyleNested } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const caps = chartInspectorCapabilities(cfg.chartType);
  const showLabel = readChartShowLabel(cfg);
  const patchLabel = (patch: Partial<NonNullable<ChartDeStyle["label"]>>) =>
    patchDeStyleNested("label", patch);
  const isKpi = cfg.chartType === "kpi";

  return (
    <ChartInspectorSection
      title={isKpi ? "指标格式" : "标签"}
      action={
        !isKpi ? (
          <Switch
            checked={showLabel}
            onCheckedChange={(show) =>
              mutateChartConfig((current) => patchChartShowLabel(current, show))
            }
            aria-label="显示数据标签"
            className="scale-90"
          />
        ) : undefined
      }
    >
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
    </ChartInspectorSection>
  );
}

export function ChartBackgroundStyleSection() {
  const { cfg, patchDeStyleNested } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const patchBackground = (patch: Partial<WidgetStyleConfig>) =>
    patchDeStyleNested("background", patch);
  const patchBorder = (patch: Partial<NonNullable<ChartDeStyle["border"]>>) =>
    patchDeStyleNested("border", patch);

  return (
    <ChartInspectorSection title="背景">
      <ChartBackgroundStyleFields
        value={deStyle.background ?? {}}
        border={deStyle.border}
        onChange={(patch) => patchBackground(patch)}
        onBorderChange={(patch) => patchBorder(patch)}
        showHeaderToggle={false}
      />
    </ChartInspectorSection>
  );
}
