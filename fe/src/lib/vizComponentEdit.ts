import type { DashboardWidgetBase } from "@/components/dashboard/dashboardLayoutContracts";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import type { VizComponentMap } from "@/lib/resolveVizComponent";
import { buildComponentMap, resolveLayoutWidget } from "@/lib/resolveVizComponent";
import {
  batchResolveVizComponents,
  collectComponentIds,
  extractWidgetPayload,
  isLinkedComponentRef,
  updateVizComponent,
  type VizComponentDetail,
  type VizComponentPayload,
} from "@/lib/vizComponents";
import { normalizeChartConfigForPortableDemo } from "@/lib/templateDemoData";
import { queueLinkedComponentPush } from "@/lib/linkedComponentSaveQueue";

export { awaitLinkedComponentWrites } from "@/lib/linkedComponentSaveQueue";

export async function pushWidgetPayloadToLibrary(
  widget: LayoutWidget,
  componentMap: VizComponentMap,
  payload: VizComponentPayload,
): Promise<VizComponentDetail | void> {
  const ref = widget.componentRef;
  if (!isLinkedComponentRef(ref)) return;
  const component = componentMap.get(ref.componentId);
  if (!component) {
    throw new Error("组件库条目不存在或无权访问");
  }
  const updated = await updateVizComponent(component.id, {
    payloadJson: payload,
    contentRevision: component.contentRevision,
  });
  componentMap.set(component.id, updated);
  return updated;
}

export function enqueueWidgetPayloadToLibrary(
  widget: LayoutWidget,
  componentMap: VizComponentMap,
  payload: VizComponentPayload,
): Promise<unknown> {
  return queueLinkedComponentPush(widget, componentMap, payload);
}

export async function syncResolvedWidgetToLibrary(
  widget: LayoutWidget,
  resolved: LayoutWidget,
  componentMap: VizComponentMap,
): Promise<VizComponentDetail | void> {
  return pushWidgetPayloadToLibrary(widget, componentMap, extractWidgetPayload(resolved));
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
    const resolved = resolveLayoutWidget(widget, componentMap);
    await pushWidgetPayloadToLibrary(widget, componentMap, extractWidgetPayload(resolved));
  }
}

/** 跨看板复制：linked 组件先 resolve 再 inline 快照（含演示 dataSourceId） */
export function prepareWidgetInlineSnapshot(widget: LayoutWidget): LayoutWidget {
  const { componentRef: _removed, ...rest } = widget;
  if (rest.type === "chart" && rest.chartConfig) {
    return {
      ...rest,
      chartConfig: normalizeChartConfigForPortableDemo(rest.chartConfig),
    } as LayoutWidget;
  }
  return rest as LayoutWidget;
}

export async function resolveWidgetForCrossDashboardCopy(
  widget: LayoutWidget,
): Promise<LayoutWidget> {
  if (!isLinkedComponentRef(widget.componentRef)) {
    return prepareWidgetInlineSnapshot(widget);
  }
  const ids = collectComponentIds([widget]);
  if (ids.length === 0) return prepareWidgetInlineSnapshot(widget);
  const { items } = await batchResolveVizComponents(ids);
  const map = buildComponentMap(items);
  return prepareWidgetInlineSnapshot(resolveLayoutWidget(widget, map));
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
