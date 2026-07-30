import { isGeoMapChartType } from "@/lib/chartViewConfig";
import type { ChartStyleSectionId } from "@/lib/chartStyleSectionRegistry";
import { ChartTableStylePanel } from "../ChartTableStylePanel";
import { ChartTableColorPanel } from "../ChartTableColorPanel";
import { ChartGeoStylePanel } from "../ChartGeoStylePanel";
import { useChartInspector } from "../ChartInspectorContext";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import { ChartVariantBasicSection } from "./ChartVariantBasicSection";
import {
  ChartBackgroundStyleSection,
  ChartLabelStyleSection,
  ChartLegendStyleSection,
  ChartPaletteStyleSection,
  ChartRemarkStyleSection,
  ChartTitleStyleSection,
} from "./ChartCommonStyleSections";
import { ChartMapBasicStyleSection } from "./ChartMapBasicStyleSection";
import {
  ChartAxisStyleSection,
  ChartCartesianShapeSection,
} from "./ChartCartesianStyleSections";
import {
  ChartBulletShapeSection,
  ChartProgressBarShapeSection,
  ChartQuadrantShapeSection,
  ChartStockLineShapeSection,
} from "./ChartCompareStyleSections";
import {
  ChartFunnelShapeSection,
  ChartGaugeStyleSection,
  ChartGraphShapeSection,
  ChartKpiIndicatorSection,
  ChartLiquidStyleSection,
  ChartPieShapeSection,
  ChartRadarShapeSection,
  ChartSankeyShapeSection,
  ChartCirclePackingShapeSection,
  ChartTreemapShapeSection,
  ChartTooltipStyleSection,
  ChartWordCloudShapeSection,
} from "./ChartTypeStyleSections";

type ChartStyleSectionProps = {
  sectionId: ChartStyleSectionId;
};

export function ChartStyleSection({ sectionId }: ChartStyleSectionProps) {
  const { cfg, onChange } = useChartInspector();
  const deStyle = readChartDeStyle(cfg);

  switch (sectionId) {
    case "tableBasic":
      return <ChartTableStylePanel />;
    case "tableColor":
      return <ChartTableColorPanel />;
    case "variantBasic":
      return <ChartVariantBasicSection />;
    case "axis":
      return <ChartAxisStyleSection />;
    case "cartesianShape":
      return <ChartCartesianShapeSection />;
    case "pieShape":
      return <ChartPieShapeSection />;
    case "gaugeShape":
      return <ChartGaugeStyleSection />;
    case "liquidShape":
      return <ChartLiquidStyleSection />;
    case "kpiIndicator":
      return <ChartKpiIndicatorSection />;
    case "funnelShape":
      return <ChartFunnelShapeSection />;
    case "sankeyShape":
      return <ChartSankeyShapeSection />;
    case "graphShape":
      return <ChartGraphShapeSection />;
    case "radarShape":
      return <ChartRadarShapeSection />;
    case "wordCloudShape":
      return <ChartWordCloudShapeSection />;
    case "treemapShape":
      return <ChartTreemapShapeSection />;
    case "circlePackingShape":
      return <ChartCirclePackingShapeSection />;
    case "quadrantShape":
      return <ChartQuadrantShapeSection />;
    case "progressBarShape":
      return <ChartProgressBarShapeSection />;
    case "bulletShape":
      return <ChartBulletShapeSection />;
    case "stockLineShape":
      return <ChartStockLineShapeSection />;
    case "tooltip":
      return <ChartTooltipStyleSection />;
    case "palette":
      return <ChartPaletteStyleSection />;
    case "mapBasic":
      return cfg.chartType === "map" ? <ChartMapBasicStyleSection /> : null;
    case "geo":
      return (
        <ChartGeoStylePanel
          cfg={cfg}
          deStyle={deStyle}
          chartType={
            cfg.chartType === "heatmap" || cfg.chartType === "t-heatmap"
              ? "heatmap"
              : cfg.chartType === "map-3d"
                ? "map-3d"
                : "map"
          }
          onChange={onChange}
        />
      );
    case "title":
      return <ChartTitleStyleSection />;
    case "remark":
      return <ChartRemarkStyleSection />;
    case "legend":
      return <ChartLegendStyleSection />;
    case "label":
      return <ChartLabelStyleSection />;
    case "background":
      return <ChartBackgroundStyleSection />;
    default:
      return null;
  }
}
