import { useMemo } from "react";
import type { VizComponentPayload, VizWidgetType } from "@/lib/vizComponents";
import { vizPayloadToLayoutWidget } from "@/lib/vizComponentPageUtils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartPreviewMock,
  ComponentPreviewShell,
  FilterPreviewMock,
  MediaPreviewMock,
  TextPreviewMock,
} from "./ComponentCardPreview";
import { VizComponentLivePreview } from "./VizComponentLivePreview";

type ComponentPayloadPreviewProps = {
  componentId: string;
  componentName: string;
  widgetType: VizWidgetType;
  payload?: VizComponentPayload;
  payloadLoading?: boolean;
  className?: string;
};

function normalizeWidgetType(type: string | undefined): VizWidgetType {
  if (type === "chart" || type === "filter" || type === "text" || type === "media") {
    return type;
  }
  return "chart";
}

function hasRenderablePayload(widgetType: VizWidgetType, payload?: VizComponentPayload): boolean {
  if (!payload) return false;
  if (widgetType === "chart") return Boolean(payload.chartConfig);
  if (widgetType === "filter") return Boolean(payload.filterConfig);
  if (widgetType === "text") return Boolean(payload.textConfig);
  if (widgetType === "media") return Boolean(payload.mediaConfig);
  return false;
}

function MockPreview({ widgetType }: { widgetType: VizWidgetType }) {
  if (widgetType === "filter") return <FilterPreviewMock />;
  if (widgetType === "text") return <TextPreviewMock />;
  if (widgetType === "media") return <MediaPreviewMock />;
  return <ChartPreviewMock />;
}

/** 组件卡片预览区：纯 payload/live 缩略图，元信息由 VizComponentCard 正文展示。 */
export function ComponentPayloadPreview({
  componentId,
  componentName,
  widgetType,
  payload,
  payloadLoading = false,
  className,
}: ComponentPayloadPreviewProps) {
  const safeType = normalizeWidgetType(widgetType);
  const canLive = hasRenderablePayload(safeType, payload);

  const widget = useMemo(() => {
    if (!canLive || !payload) return null;
    return vizPayloadToLayoutWidget({
      id: componentId,
      name: componentName,
      widgetType: safeType,
      payload,
      widgetIdPrefix: "vc-card",
    });
  }, [canLive, componentId, componentName, payload, safeType]);

  return (
    <ComponentPreviewShell className={className}>
      {payloadLoading ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : widget ? (
        <VizComponentLivePreview widget={widget} lazy geo3dRenderTier="thumbnail" compact />
      ) : (
        <MockPreview widgetType={safeType} />
      )}
    </ComponentPreviewShell>
  );
}
