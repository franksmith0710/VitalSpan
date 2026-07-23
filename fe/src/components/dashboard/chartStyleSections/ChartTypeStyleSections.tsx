import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChartInspector } from "../ChartInspectorContext";
import { DashboardConfigSection } from "../DashboardConfigSection";
import { ChartDeSliderField } from "../deAttrSlider";
import { InspectorSwitchRow, INSPECTOR_SECTION_GAP, INSPECTOR_SELECT } from "../inspectorCompact";
import {
  DEFAULT_PIE_INNER_RADIUS_PERCENT,
  patchChartDeStyleNested,
  PIE_INNER_RADIUS_MAX,
  PIE_INNER_RADIUS_MIN,
  readChartDeStyle,
} from "@/lib/chartDeStyle";
import { DEFAULT_PIE_OUTER_RADIUS_PERCENT } from "@/lib/chartDeStyleBlocks";

function patchBlock<K extends "pie" | "gauge" | "liquid" | "kpi" | "funnel" | "sankey" | "graph" | "radar" | "wordCloud">(
  cfg: Parameters<typeof patchChartDeStyleNested>[0],
  key: K,
  patch: Record<string, unknown>,
) {
  return patchChartDeStyleNested(cfg, key, patch);
}

export function ChartPieShapeSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const pie = readChartDeStyle(cfg).pie ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "pie", p));

  return (
    <DashboardConfigSection title="饼图样式" compact data-testid="chart-pie-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <ChartDeSliderField
          label="内径 %"
          value={pie.innerRadiusPercent}
          fallback={DEFAULT_PIE_INNER_RADIUS_PERCENT}
          min={PIE_INNER_RADIUS_MIN}
          max={PIE_INNER_RADIUS_MAX}
          step={1}
          unit="%"
          onChange={(innerRadiusPercent) => patch({ innerRadiusPercent })}
        />
        <ChartDeSliderField
          label="外径 %"
          value={pie.outerRadiusPercent}
          fallback={DEFAULT_PIE_OUTER_RADIUS_PERCENT}
          min={40}
          max={90}
          step={1}
          unit="%"
          onChange={(outerRadiusPercent) => patch({ outerRadiusPercent })}
        />
        <ChartDeSliderField
          label="扇区间距"
          value={pie.padAngle}
          fallback={0}
          min={0}
          max={8}
          step={0.5}
          onChange={(padAngle) => patch({ padAngle })}
        />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartGaugeStyleSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const gauge = readChartDeStyle(cfg).gauge ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "gauge", p));

  return (
    <DashboardConfigSection title="仪表样式" compact data-testid="chart-gauge-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <ChartDeSliderField label="最小值" value={gauge.min} fallback={0} min={0} max={1000} step={1} onChange={(min) => patch({ min })} />
        <ChartDeSliderField label="最大值" value={gauge.max} fallback={100} min={1} max={10000} step={1} onChange={(max) => patch({ max })} />
        <ChartDeSliderField label="起始角 °" value={gauge.startAngleDeg} fallback={-135} min={-180} max={0} step={5} onChange={(startAngleDeg) => patch({ startAngleDeg })} />
        <ChartDeSliderField label="结束角 °" value={gauge.endAngleDeg} fallback={135} min={0} max={180} step={5} onChange={(endAngleDeg) => patch({ endAngleDeg })} />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartLiquidStyleSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const liquid = readChartDeStyle(cfg).liquid ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "liquid", p));

  return (
    <DashboardConfigSection title="水波样式" compact data-testid="chart-liquid-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <ChartDeSliderField label="目标线（%）" value={liquid.targetValue} fallback={100} min={0} max={100} step={1} onChange={(targetValue) => patch({ targetValue })} />
        <ChartDeSliderField label="轮廓宽度" value={liquid.outlineWidth} fallback={2} min={0} max={8} step={1} onChange={(outlineWidth) => patch({ outlineWidth })} />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartKpiIndicatorSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const kpi = readChartDeStyle(cfg).kpi ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "kpi", p));

  return (
    <DashboardConfigSection title="指标样式" compact data-testid="chart-kpi-indicator">
      <div className={INSPECTOR_SECTION_GAP}>
        <ChartDeSliderField label="字号" value={kpi.fontSize} fallback={28} min={12} max={64} step={1} onChange={(fontSize) => patch({ fontSize })} />
        <div className="border-b border-gray-100 py-2 dark:border-white/[0.06]">
          <p className="mb-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">对齐</p>
          <Select value={kpi.align ?? "center"} onValueChange={(align) => patch({ align })}>
            <SelectTrigger className={INSPECTOR_SELECT} aria-label="指标对齐">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">左</SelectItem>
              <SelectItem value="center">中</SelectItem>
              <SelectItem value="right">右</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </DashboardConfigSection>
  );
}

export function ChartFunnelShapeSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const funnel = readChartDeStyle(cfg).funnel ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "funnel", p));

  return (
    <DashboardConfigSection title="漏斗样式" compact data-testid="chart-funnel-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <ChartDeSliderField label="层间距" value={funnel.gap} fallback={4} min={0} max={24} step={1} onChange={(gap) => patch({ gap })} />
        <InspectorSwitchRow
          label="显示转化率"
          checked={funnel.showConversionRate === true}
          onCheckedChange={(showConversionRate) => patch({ showConversionRate })}
        />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartSankeyShapeSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const sankey = readChartDeStyle(cfg).sankey ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "sankey", p));

  return (
    <DashboardConfigSection title="桑基样式" compact data-testid="chart-sankey-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <ChartDeSliderField label="节点宽度" value={sankey.nodeWidth} fallback={12} min={4} max={40} step={1} onChange={(nodeWidth) => patch({ nodeWidth })} />
        <ChartDeSliderField label="节点间距" value={sankey.nodeGap} fallback={8} min={0} max={32} step={1} onChange={(nodeGap) => patch({ nodeGap })} />
        <ChartDeSliderField label="链接透明度" value={sankey.linkOpacity} fallback={0.4} min={0.1} max={1} step={0.05} onChange={(linkOpacity) => patch({ linkOpacity })} />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartGraphShapeSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const graph = readChartDeStyle(cfg).graph ?? {};

  return (
    <DashboardConfigSection title="关系图样式" compact data-testid="chart-graph-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <div className="border-b border-gray-100 py-2 dark:border-white/[0.06]">
          <p className="mb-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">布局</p>
          <Select
            value={graph.layout ?? cfg.styleVariant ?? "force"}
            onValueChange={(layout) =>
              mutateChartConfig((current) => {
                const withGraph = patchBlock(current, "graph", { layout });
                return { ...withGraph, styleVariant: layout };
              })
            }
          >
            <SelectTrigger className={INSPECTOR_SELECT} aria-label="关系图布局">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="force">力导向</SelectItem>
              <SelectItem value="dagre">紧凑排列</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ChartDeSliderField
          label="斥力"
          value={graph.repulsion}
          fallback={120}
          min={20}
          max={400}
          step={10}
          onChange={(repulsion) =>
            mutateChartConfig((current) => patchBlock(current, "graph", { repulsion }))
          }
        />
        <ChartDeSliderField
          label="边长"
          value={graph.edgeLength}
          fallback={80}
          min={20}
          max={300}
          step={5}
          onChange={(edgeLength) =>
            mutateChartConfig((current) => patchBlock(current, "graph", { edgeLength }))
          }
        />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartRadarShapeSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const radar = readChartDeStyle(cfg).radar ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "radar", p));

  return (
    <DashboardConfigSection title="雷达样式" compact data-testid="chart-radar-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <div className="border-b border-gray-100 py-2 dark:border-white/[0.06]">
          <p className="mb-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">形状</p>
          <Select
            value={radar.shape ?? "polygon"}
            onValueChange={(shape) => patch({ shape })}
          >
            <SelectTrigger className={INSPECTOR_SELECT} aria-label="雷达图形状">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="polygon">多边形</SelectItem>
              <SelectItem value="circle">圆形</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <InspectorSwitchRow
          label="显示轴名称"
          checked={radar.showAxisName !== false}
          onCheckedChange={(showAxisName) => patch({ showAxisName })}
        />
        <ChartDeSliderField label="区域透明度" value={radar.areaOpacity} fallback={0.25} min={0.05} max={0.8} step={0.05} onChange={(areaOpacity) => patch({ areaOpacity })} />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartWordCloudShapeSection() {
  const { cfg, mutateChartConfig } = useChartInspector();
  const wordCloud = readChartDeStyle(cfg).wordCloud ?? {};
  const patch = (p: Record<string, unknown>) =>
    mutateChartConfig((c) => patchChartDeStyleNested(c, "wordCloud", p));

  return (
    <DashboardConfigSection title="词云样式" compact data-testid="chart-wordcloud-shape">
      <div className={INSPECTOR_SECTION_GAP}>
        <ChartDeSliderField label="最小字号" value={wordCloud.fontSizeMin} fallback={12} min={8} max={48} step={1} onChange={(fontSizeMin) => patch({ fontSizeMin })} />
        <ChartDeSliderField label="最大字号" value={wordCloud.fontSizeMax} fallback={48} min={16} max={96} step={1} onChange={(fontSizeMax) => patch({ fontSizeMax })} />
        <ChartDeSliderField label="间距" value={wordCloud.spacing} fallback={2} min={0} max={16} step={1} onChange={(spacing) => patch({ spacing })} />
      </div>
    </DashboardConfigSection>
  );
}

export function ChartTooltipStyleSection() {
  const { cfg, patchDeStyleNested, dashboardStyle } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);
  const tooltip = deStyle.tooltip ?? {};

  return (
    <DashboardConfigSection title="提示" compact data-testid="chart-tooltip-style">
      <div className={INSPECTOR_SECTION_GAP}>
        <InspectorSwitchRow
          label="显示提示"
          checked={tooltip.show !== false}
          onCheckedChange={(show) => patchDeStyleNested("tooltip", { show })}
        />
        <ChartDeSliderField
          label="字号"
          value={tooltip.fontSize}
          fallback={dashboardStyle?.chartTooltipStyle?.fontSize ?? 12}
          min={10}
          max={20}
          step={1}
          onChange={(fontSize) => patchDeStyleNested("tooltip", { fontSize })}
        />
      </div>
    </DashboardConfigSection>
  );
}
