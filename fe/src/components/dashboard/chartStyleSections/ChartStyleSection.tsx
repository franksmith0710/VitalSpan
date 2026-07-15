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
    case "palette":
      return <ChartPaletteStyleSection />;
    case "geo":
      return (
        <ChartGeoStylePanel
          cfg={cfg}
          deStyle={deStyle}
          chartType={cfg.chartType === "heatmap" ? "heatmap" : "map"}
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
