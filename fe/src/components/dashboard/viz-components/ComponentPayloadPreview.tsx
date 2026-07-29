import { useMemo, type ReactNode } from "react";
import type { VizComponentListItem, VizComponentPayload, VizWidgetType } from "@/lib/vizComponents";
import { vizPayloadToLayoutWidget } from "@/lib/vizComponentPageUtils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartPreviewMock,
  ComponentPreviewShell,
  FilterPreviewMock,
  MediaPreviewMock,
  PreviewFooterMeta,
  TextPreviewMock,
} from "./ComponentCardPreview";
import { VizComponentLivePreview } from "./VizComponentLivePreview";
import { categoryLabel, statusLabel, visibilityLabel } from "./componentLabels";

type ComponentPayloadPreviewProps = {
  componentId: string;
  componentName: string;
  widgetType: VizWidgetType;
  payload?: VizComponentPayload;
  payloadLoading?: boolean;
  categoryKey?: string;
  visibility?: VizComponentListItem["visibility"];
  status?: VizComponentListItem["status"];
  className?: string;
};

function normalizeWidgetType(type: string | undefined): VizWidgetType {
  if (type === "chart" || type === "filter" || type === "text" || type === "media") {
    return type;
  }
  return "chart";
}

function buildFooterTrailing({
  categoryKey,
  visibility,
  status,
}: Pick<ComponentPayloadPreviewProps, "categoryKey" | "visibility" | "status">): ReactNode {
  const parts: string[] = [];
  if (categoryKey) parts.push(categoryLabel(categoryKey));
  if (visibility) parts.push(visibilityLabel(visibility));
  if (status && status !== "published") parts.push(statusLabel(status));
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function buildDetail(widgetType: VizWidgetType, payload?: VizComponentPayload): string | undefined {
  if (widgetType === "chart") {
    return payload?.chartConfig?.chartType;
  }
  return undefined;
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

export function ComponentPayloadPreview({
  componentId,
  componentName,
  widgetType,
  payload,
  payloadLoading = false,
  categoryKey,
  visibility,
  status,
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
    <ComponentPreviewShell
      className={className}
      footer={
        <PreviewFooterMeta
          widgetType={safeType}
          detail={buildDetail(safeType, payload)}
          trailing={buildFooterTrailing({ categoryKey, visibility, status })}
        />
      }
    >
      {payloadLoading ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : widget ? (
        <VizComponentLivePreview widget={widget} lazy geo3dRenderTier="thumbnail" />
      ) : (
        <MockPreview widgetType={safeType} />
      )}
    </ComponentPreviewShell>
  );
}
