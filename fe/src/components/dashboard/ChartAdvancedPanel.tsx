import { useMemo } from "react";
import { chartInspectorCapabilities } from "@/lib/chartInspectorCapabilities";
import {
  readChartConditionalRules,
  readChartDeFeatures,
  readChartJumpConfig,
  readChartMarkLines,
} from "@/lib/chartDeFeatures";
import { useChartInspector } from "./chartInspectorContext";
import { InspectorSubtleEmpty } from "./inspectorCompact";
import { WidgetAdvancedAccordion } from "./WidgetAdvancedAccordion";
import {
  ChartAdvancedConditionalSection,
  ChartAdvancedFeatureSettings,
  ChartAdvancedJumpSection,
  ChartAdvancedMapBubbleSection,
  ChartAdvancedMapLinkageSection,
  ChartAdvancedMapAreaMappingSection,
  ChartAdvancedMarkLinesSection,
} from "./chartAdvancedSections";
import { readChartDeStyle, readChartGeoStyle } from "@/lib/chartDeStyle";
import { countEffectiveAreaMappings } from "@/lib/chartGeoAreaMapping";
import { readChartLinkageConfig } from "@/lib/chartDeFeatures";

type ChartAdvancedPanelProps = Record<string, never>;

/** DataEase chart-edit「高级」Tab：按图表能力动态展示区块 */
export function ChartAdvancedPanel(_props: ChartAdvancedPanelProps) {
  const { cfg } = useChartInspector();
  const caps = chartInspectorCapabilities(cfg.chartType);

  const sections = useMemo(() => {
    const markLines = readChartMarkLines(cfg);
    const rules = readChartConditionalRules(cfg);
    const jump = readChartJumpConfig(cfg);
    const mapLinkage = readChartLinkageConfig(cfg);
    const list = [];

    if (caps.dataZoom || caps.timeRange) {
      const features = readChartDeFeatures(cfg);
      const featureTitle =
        caps.dataZoom && caps.timeRange
          ? "功能设置"
          : caps.dataZoom
            ? "缩略轴"
            : "时间范围";
      list.push({
        id: "feature",
        title: featureTitle,
        defaultOpen: Boolean(features.dataZoom || cfg.timeRange?.enabled),
        badge:
          caps.dataZoom && features.dataZoom
            ? "开"
            : cfg.timeRange?.enabled
              ? "开"
              : undefined,
        content: <ChartAdvancedFeatureSettings />,
      });
    }

    if (caps.markLines) {
      list.push({
        id: "guide",
        title: "辅助线",
        defaultOpen: markLines.length > 0,
        badge: markLines.filter((line) => line.enabled).length,
        content: <ChartAdvancedMarkLinesSection />,
      });
    }

    if (caps.conditional) {
      list.push({
        id: "conditional",
        title: "条件样式",
        defaultOpen: rules.length > 0,
        badge: rules.filter((rule) => rule.enabled).length,
        content: <ChartAdvancedConditionalSection />,
      });
    }

    if (cfg.chartType === "map" || cfg.chartType === "map-3d") {
      const geoForMapping = readChartGeoStyle(readChartDeStyle(cfg));
      const mappingCount = countEffectiveAreaMappings(geoForMapping.areaMapping);
      list.push({
        id: "map-area-mapping",
        title: "地名映射",
        defaultOpen: mappingCount > 0,
        badge: mappingCount > 0 ? mappingCount : undefined,
        content: <ChartAdvancedMapAreaMappingSection />,
      });
    }

    if (cfg.chartType === "map") {
      list.push({
        id: "map-linkage",
        title: "联动设置",
        defaultOpen: mapLinkage.enabled,
        badge: mapLinkage.enabled ? "开" : undefined,
        content: <ChartAdvancedMapLinkageSection />,
      });
    }

    if (caps.jump) {
      list.push({
        id: "jump",
        title: "跳转设置",
        defaultOpen: jump.enabled,
        content: <ChartAdvancedJumpSection />,
      });
    }

    if (cfg.chartType === "map") {
      const geo = readChartGeoStyle(readChartDeStyle(cfg));
      list.push({
        id: "map-bubble",
        title: "气泡动效",
        defaultOpen: geo.bubbleEffect === true,
        badge: geo.bubbleEffect ? "开" : undefined,
        content: <ChartAdvancedMapBubbleSection />,
      });
    }

    return list;
  }, [caps, cfg]);

  if (sections.length === 0) {
    return (
      <InspectorSubtleEmpty message="当前图表类型暂无高级配置项；可切换柱图/折线图以使用更多能力。" />
    );
  }

  return <WidgetAdvancedAccordion sections={sections} />;
};
