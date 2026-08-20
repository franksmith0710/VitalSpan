import { useMemo } from "react";
import type { VizComponentPayload, VizWidgetType } from "@/lib/vizComponents";
import { vizPayloadToLayoutWidget } from "@/lib/vizComponentPageUtils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartPreviewMock,
  ComponentPreviewShell,
  CustomVizPreviewMock,
  FilterPreviewMock,
  MediaPreviewMock,
  TextPreviewMock,
} from "./ComponentCardPreview";
import { isCustomVizConfigReady } from "@/components/dashboard/CustomVizWidget";
import { vizComponentPreviewDashboardStyle } from "@/lib/vizComponentPreviewStyle";
import { VizComponentLivePreview } from "./VizComponentLivePreview";

const previewDashboardStyle = vizComponentPreviewDashboardStyle();

type ComponentPayloadPreviewProps = {
  componentId: string;
  componentName: string;
  widgetType: VizWidgetType;
  payload?: VizComponentPayload;
  payloadLoading?: boolean;
  previewPaused?: boolean;
  className?: string;
};

function normalizeWidgetType(type: string | undefined): VizWidgetType {
  if (
    type === "chart" ||
    type === "filter" ||
    type === "text" ||
    type === "media" ||
    type === "customViz"
  ) {
    return type;
  }
  return "chart";
}

function resolvePreviewWidgetType(
  widgetType: VizWidgetType,
  payload?: VizComponentPayload,
): VizWidgetType {
  if (payload?.customVizConfig && isCustomVizConfigReady(payload.customVizConfig)) {
    return "customViz";
  }
  return normalizeWidgetType(widgetType);
}

function hasRenderablePayload(widgetType: VizWidgetType, payload?: VizComponentPayload): boolean {
  if (!payload) return false;
  const previewType = resolvePreviewWidgetType(widgetType, payload);
  if (previewType === "chart") return Boolean(payload.chartConfig);
  if (previewType === "filter") return Boolean(payload.filterConfig);
  if (previewType === "text") return Boolean(payload.textConfig);
  if (previewType === "media") return Boolean(payload.mediaConfig);
  if (previewType === "customViz") return isCustomVizConfigReady(payload.customVizConfig);
  return false;
}

function MockPreview({ widgetType }: { widgetType: VizWidgetType }) {
  if (widgetType === "filter") return <FilterPreviewMock />;
  if (widgetType === "text") return <TextPreviewMock />;
  if (widgetType === "media") return <MediaPreviewMock />;
  if (widgetType === "customViz") return <CustomVizPreviewMock />;
  return <ChartPreviewMock />;
}

/** 组件卡片预览区：纯 payload/live 缩略图，元信息由 VizComponentCard 正文展示。 */
export function ComponentPayloadPreview({
  componentId,
  componentName,
  widgetType,
  payload,
  payloadLoading = false,
  previewPaused = false,
  className,
}: ComponentPayloadPreviewProps) {
  const previewType = resolvePreviewWidgetType(normalizeWidgetType(widgetType), payload);
  const canLive = hasRenderablePayload(previewType, payload);

  const widget = useMemo(() => {
    if (!canLive || !payload) return null;
    return vizPayloadToLayoutWidget({
      id: componentId,
      name: componentName,
      widgetType: previewType,
      payload,
      widgetIdPrefix: "vc-card",
    });
  }, [canLive, componentId, componentName, payload, previewType]);

  return (
    <ComponentPreviewShell className={className}>
      {payloadLoading ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : widget ? (
        <VizComponentLivePreview
          widget={widget}
          dashboardStyle={previewDashboardStyle}
          lazy
          paused={previewPaused}
          geo3dRenderTier="thumbnail"
          compact
        />
      ) : (
        <MockPreview widgetType={previewType} />
      )}
    </ComponentPreviewShell>
  );
}
