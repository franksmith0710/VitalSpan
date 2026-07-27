import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import type { VizComponentMap } from "@/lib/resolveVizComponent";
import type { VizComponentDetail } from "@/lib/vizComponents";

export function componentDetailToLayoutWidget(detail: VizComponentDetail): LayoutWidget {
  const base = {
    id: `vc-edit-${detail.id}`,
    title: detail.name,
    colSpan: 12,
    rowSpan: 8,
    order: 0,
    componentRef: { componentId: detail.id },
  };

  const payload = detail.payloadJson;
  switch (detail.widgetType) {
    case "chart":
      return {
        ...base,
        type: "chart",
        chartConfig: payload.chartConfig,
        chartId: detail.id,
      } as LayoutWidget;
    case "filter":
      return {
        ...base,
        type: "filter",
        filterConfig: payload.filterConfig!,
      } as LayoutWidget;
    case "text":
      return {
        ...base,
        type: "text",
        textConfig: payload.textConfig!,
      } as LayoutWidget;
    case "media":
      return {
        ...base,
        type: "media",
        mediaConfig: payload.mediaConfig!,
      } as LayoutWidget;
    default:
      throw new Error(`Unsupported widget type: ${detail.widgetType}`);
  }
}

export function buildSingleComponentMap(detail: VizComponentDetail): VizComponentMap {
  return new Map([[detail.id, detail]]);
}
