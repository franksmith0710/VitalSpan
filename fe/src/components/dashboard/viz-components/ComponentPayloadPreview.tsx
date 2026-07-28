import { useMemo, type ReactNode } from "react";
import type { VizComponentListItem, VizComponentPayload, VizWidgetType } from "@/lib/vizComponents";
import { vizPayloadToLayoutWidget } from "@/lib/vizComponentPageUtils";
import { VizComponentLivePreview } from "@/components/dashboard/viz-components/VizComponentLivePreview";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartPreviewMock,
  ComponentPreviewShell,
  FilterPreviewMock,
  MediaPreviewMock,
  PreviewFooterMeta,
  TextPreviewMock,
} from "./ComponentCardPreview";
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
  const widget = useMemo(() => {
    if (!payload) return null;
    return vizPayloadToLayoutWidget({
      id: componentId,
      name: componentName,
      widgetType: safeType,
      payload,
    });
  }, [componentId, componentName, payload, safeType]);

  const footer = (
    <PreviewFooterMeta
      widgetType={safeType}
      detail={buildDetail(safeType, payload)}
      trailing={buildFooterTrailing({ categoryKey, visibility, status })}
    />
  );

  return (
    <ComponentPreviewShell className={className} footer={footer}>
      {payloadLoading ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : widget ? (
        <VizComponentLivePreview widget={widget} lazy geo3dRenderTier="thumbnail" className="h-full" />
      ) : (
        <MockPreview widgetType={safeType} />
      )}
    </ComponentPreviewShell>
  );
}
