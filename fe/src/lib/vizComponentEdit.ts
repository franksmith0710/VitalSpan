import type { DashboardWidgetBase } from "@/components/dashboard/dashboardLayoutContracts";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import type { VizComponentMap } from "@/lib/resolveVizComponent";
import {
  extractWidgetPayload,
  isLinkedComponentRef,
  updateVizComponent,
  type VizComponentPayload,
} from "@/lib/vizComponents";

export async function pushWidgetPayloadToLibrary(
  widget: LayoutWidget,
  componentMap: VizComponentMap,
  payload: VizComponentPayload,
): Promise<void> {
  const ref = widget.componentRef;
  if (!isLinkedComponentRef(ref)) return;
  const component = componentMap.get(ref.componentId);
  if (!component) {
    throw new Error("组件库条目不存在或无权访问");
  }
  await updateVizComponent(component.id, {
    payloadJson: payload,
    contentRevision: component.contentRevision,
  });
}

export async function syncResolvedWidgetToLibrary(
  widget: LayoutWidget,
  resolved: LayoutWidget,
  componentMap: VizComponentMap,
): Promise<void> {
  await pushWidgetPayloadToLibrary(widget, componentMap, extractWidgetPayload(resolved));
}

export async function flushLinkedLocalOverridesToLibrary(
  widgets: LayoutWidget[],
  componentMap: VizComponentMap,
): Promise<void> {
  for (const widget of widgets) {
    if (!isLinkedComponentRef(widget.componentRef)) continue;
    const hasLocalPayload =
      (widget.type === "chart" && Boolean(widget.chartConfig)) ||
      (widget.type === "filter" && Boolean(widget.filterConfig)) ||
      (widget.type === "text" && Boolean(widget.textConfig)) ||
      (widget.type === "media" && Boolean(widget.mediaConfig));
    if (!hasLocalPayload) continue;
    await pushWidgetPayloadToLibrary(widget, componentMap, extractWidgetPayload(widget));
  }
}

export function relinkWidgetToComponent(
  widget: LayoutWidget,
  componentId: string,
): LayoutWidget {
  const { chartConfig, filterConfig, textConfig, mediaConfig, ...rest } = widget;
  return {
    ...rest,
    componentRef: { componentId },
  };
}

export function isPublishableWidgetType(
  type: DashboardWidgetBase["type"],
): type is "chart" | "filter" | "text" | "media" {
  return type === "chart" || type === "filter" || type === "text" || type === "media";
}
