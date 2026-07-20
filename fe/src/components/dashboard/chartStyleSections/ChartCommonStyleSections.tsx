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
import { ChartDeAttrField, CHART_DE_INPUT } from "../chartInspectorDeFields";
import { ChartPaletteFontSizeSelect } from "../chartPaletteShared";
import { ChartPaletteDeParityFields } from "../chartPaletteDeParityFields";
import { ChartTableColorFields } from "../chartPaletteLabelTooltipFields";
import { ChartLegendDeParityFields } from "../chartLegendStyleFields";
import { useChartInspector } from "../chartInspectorContext";
import {
  patchChartLabelStyle,
  patchChartShowLabel,
  readChartDeStyle,
  readChartLegendVisible,
  readChartShowLabel,
  readChartTitleVisible,
  resolveChartLabelPresentation,
  resolveChartTooltipPresentation,
  resolveChartLabelDisplayColor,
  resolveChartTooltipDisplayColor,
  resolveChartTooltipDisplayBackground,
  readChartTooltipShow,
  type ChartDeStyle,
} from "@/lib/chartDeStyle";
import type { WidgetStyleConfig } from "../dashboardStyleConfig";
import { chartInspectorCapabilities } from "@/lib/chartInspectorCapabilities";
import {
  resolveChartSeriesColorItems,
  supportsChartSeriesColorEditing,
} from "@/lib/chartSeriesColor";
import { patchChartDeTableStyle, readChartDeTableStyle } from "@/lib/chartDeTableStyle";
import { isTableLikeChartType, tableStyleSectionsForType } from "@/lib/chartTableInspector";
import { ChartInspectorSection, INSPECTOR_SELECT, INSPECTOR_SWITCH_SIZE, InspectorInlineColorRow } from "../inspectorCompact";
import { DeTitleStyleToolbar } from "../deTitleStyleToolbar";

export function ChartPaletteStyleSection() {
  const { cfg, patchDeStyle, patchDeStyleNested, mutateChartConfig, dashboardStyle } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const caps = chartInspectorCapabilities(cfg.chartType);
  const isTableLike = isTableLikeChartType(cfg.chartType);
  const tableColorInOwnSection = tableStyleSectionsForType(cfg.chartType).includes("tableColor");
  const labelPresentation = resolveChartLabelPresentation(cfg, dashboardStyle);
  const tooltipPresentation = resolveChartTooltipPresentation(cfg, dashboardStyle);

  const patchPaletteOpacity = (opacityPercent: number) =>
    patchDeStyle({ paletteOpacity: opacityPercent / 100 });

  const seriesColorItems = supportsChartSeriesColorEditing(cfg.chartType)
    ? resolveChartSeriesColorItems(cfg, deStyle.paletteId, deStyle.seriesColor)
    : [];

  return (
    <ChartInspectorSection title="图表配色" defaultOpen>
      <ChartPaletteDeParityFields
        dense
        showInherit
        dashboardPaletteId={dashboardStyle?.paletteId}
        dashboardPaletteColors={dashboardStyle?.paletteColors}
        paletteId={deStyle.paletteId}
        seriesColor={seriesColorItems.length > 0 ? seriesColorItems : undefined}
        paletteOpacity={deStyle.paletteOpacity}
        seriesGradient={deStyle.seriesGradient ?? false}
        labelShow={readChartShowLabel(cfg, dashboardStyle)}
        tooltipShow={readChartTooltipShow(cfg, dashboardStyle)}
        labelStyle={{
          fontSize: labelPresentation.fontSize,
          color: deStyle.label?.color,
        }}
        tooltipStyle={{
          fontSize: tooltipPresentation.fontSize,
          color: deStyle.tooltip?.color,
          background: deStyle.tooltip?.background,
        }}
        labelColorFallback={resolveChartLabelDisplayColor(cfg, dashboardStyle)}
        tooltipColorFallback={resolveChartTooltipDisplayColor(cfg, dashboardStyle)}
        tooltipBackgroundFallback={resolveChartTooltipDisplayBackground(cfg, dashboardStyle)}
        showLabelToggle={caps.label}
        showTooltipToggle={!isTableLike && cfg.chartType !== "t-heatmap"}
        showGradientToggle={!isTableLike && cfg.chartType !== "t-heatmap"}
        onPaletteChange={(paletteId) => {
          patchDeStyle({
            paletteId,
            seriesColor: undefined,
            ...(paletteId === undefined
              ? { paletteOpacity: undefined }
              : {}),
          });
        }}
        onSeriesColorsChange={(items) =>
          patchDeStyle({ seriesColor: items.length > 0 ? [...items] : undefined })
        }
        onOpacityChange={patchPaletteOpacity}
        onOpacityPreview={patchPaletteOpacity}
        onSeriesGradientChange={(enabled) => patchDeStyle({ seriesGradient: enabled })}
        onLabelShowChange={(show) =>
          mutateChartConfig((current) => patchChartShowLabel(current, show))
        }
        onTooltipShowChange={(show) => patchDeStyleNested("tooltip", { show })}
        onLabelStyleChange={(patch) =>
          mutateChartConfig((current) => patchChartLabelStyle(current, patch))
        }
        onTooltipStyleChange={(patch) => patchDeStyleNested("tooltip", patch)}
        tableColorSection={
          isTableLike && !tableColorInOwnSection ? (
            <ChartTableColorFields
              compact
              tableStyle={readChartDeTableStyle(cfg)}
              onPatch={(patch) =>
                mutateChartConfig((current) => patchChartDeTableStyle(current, patch))
              }
            />
          ) : undefined
        }
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
          size={INSPECTOR_SWITCH_SIZE}
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
          size={INSPECTOR_SWITCH_SIZE}
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
          size={INSPECTOR_SWITCH_SIZE}
        />
      }
    >
      {legendVisible ? (
        <ChartLegendDeParityFields deStyle={deStyle} onPatch={patchLegend} />
      ) : null}
    </ChartInspectorSection>
  );
}

export function ChartLabelStyleSection() {
  const { cfg, mutateChartConfig, patchDeStyleNested, dashboardStyle } = useChartInspector();
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
            size={INSPECTOR_SWITCH_SIZE}
          />
        ) : undefined
      }
    >
      {!isKpi ? (
        <>
          <InspectorInlineColorRow
            label="字体颜色"
            allowClear
            swatches={TEXT_COLOR_RECOMMENDED}
            value={deStyle.label?.color ?? ""}
            fallbackValue={resolveChartLabelDisplayColor(cfg, dashboardStyle)}
            onChange={(color) =>
              mutateChartConfig((current) =>
                patchChartLabelStyle(current, { color: color || undefined }),
              )
            }
          />
          <ChartPaletteFontSizeSelect
            density="narrow"
            value={deStyle.label?.fontSize}
            fallback={12}
            onChange={(fontSize) => patchLabel({ fontSize })}
          />
        </>
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
