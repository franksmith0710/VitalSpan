import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import {
  componentDetailToLayoutWidget,
  buildSingleComponentMap,
  componentEditorSnapshot,
  widgetEditorSnapshot,
} from "@/lib/vizComponentPageUtils";
import {
  extractWidgetPayload,
  fetchVizComponent,
  updateVizComponent,
  type VizComponentDetail,
} from "@/lib/vizComponents";
import { persistVizComponentThumbnailBestEffort } from "@/lib/uploadVizComponentThumbnail";

export function useVizComponentEditor(componentId: string | undefined) {
  const queryClient = useQueryClient();
  const [widget, setWidget] = useState<LayoutWidget | null>(null);
  const [saving, setSaving] = useState(false);
  const hydratedRevisionRef = useRef<number | null>(null);

  const detailQuery = useQuery({
    queryKey: queryKeys.vizComponents.detail(componentId ?? ""),
    queryFn: () => fetchVizComponent(componentId!),
    enabled: Boolean(componentId),
  });

  const component = detailQuery.data ?? null;
  const componentMap = component ? buildSingleComponentMap(component) : new Map();

  useEffect(() => {
    if (!component) return;
    if (widget !== null && hydratedRevisionRef.current === component.contentRevision) {
      return;
    }
    hydratedRevisionRef.current = component.contentRevision;
    setWidget(componentDetailToLayoutWidget(component));
  }, [component, widget]);

  const isDirty = useMemo(() => {
    if (!component || !widget) return false;
    return widgetEditorSnapshot(widget) !== componentEditorSnapshot(component);
  }, [component, widget]);

  const applyDetail = useCallback(
    (detail: VizComponentDetail) => {
      queryClient.setQueryData(queryKeys.vizComponents.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: queryKeys.vizComponents.all });
      hydratedRevisionRef.current = detail.contentRevision;
      setWidget(componentDetailToLayoutWidget(detail));
    },
    [queryClient],
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (!component || !widget || !isDirty) return true;
    setSaving(true);
    try {
      const updated = await updateVizComponent(component.id, {
        name: widget.title?.trim() || component.name,
        payloadJson: extractWidgetPayload(widget),
        contentRevision: component.contentRevision,
      });
      applyDetail(updated);
      await persistVizComponentThumbnailBestEffort(component.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.vizComponents.all });
      toast.success("组件已保存");
      return true;
    } catch (err) {
      const message = mapApiError(err);
      toast.error(message);
      if (message.includes("contentRevision") || message.includes("冲突")) {
        void detailQuery.refetch();
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [applyDetail, component, detailQuery, isDirty, queryClient, widget]);

  const patchWidget = useCallback((patch: Partial<LayoutWidget>) => {
    setWidget((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return {
    component,
    widget,
    componentMap,
    saving,
    isDirty,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    refetch: detailQuery.refetch,
    save,
    patchWidget,
  };
}
