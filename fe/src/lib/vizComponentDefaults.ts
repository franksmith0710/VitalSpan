import {
  defaultChartConfig,
  defaultFilterConfig,
  defaultMediaConfig,
  defaultTextConfig,
} from "@/components/dashboard/layoutUtils";
import type { VizComponentPayload, VizWidgetType } from "./vizComponents";

export function defaultVizComponentPayload(widgetType: VizWidgetType): VizComponentPayload {
  const seedId = crypto.randomUUID();
  switch (widgetType) {
    case "chart":
      return { chartConfig: { ...defaultChartConfig("bar"), chartId: seedId } };
    case "filter":
      return { filterConfig: defaultFilterConfig(seedId) };
    case "text":
      return { textConfig: defaultTextConfig() };
    case "media":
      return { mediaConfig: defaultMediaConfig() };
    default:
      return { chartConfig: { ...defaultChartConfig("bar"), chartId: seedId } };
  }
}

export function defaultVizComponentName(widgetType: VizWidgetType): string {
  switch (widgetType) {
    case "chart":
      return "未命名图表";
    case "filter":
      return "未命名筛选器";
    case "text":
      return "未命名富文本";
    case "media":
      return "未命名媒体";
    default:
      return "未命名组件";
  }
}
