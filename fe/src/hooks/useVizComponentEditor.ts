import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import {
  componentDetailToLayoutWidget,
  buildSingleComponentMap,
} from "@/lib/vizComponentPageUtils";
import {
  fetchVizComponent,
  updateVizComponent,
  type VizComponentDetail,
  type VizComponentPayload,
} from "@/lib/vizComponents";

export function useVizComponentEditor(componentId: string | undefined) {
  const queryClient = useQueryClient();
  const [widget, setWidget] = useState<LayoutWidget | null>(null);
  const [saving, setSaving] = useState(false);

  const detailQuery = useQuery({
    queryKey: queryKeys.vizComponents.detail(componentId ?? ""),
    queryFn: () => fetchVizComponent(componentId!),
    enabled: Boolean(componentId),
  });

  const component = detailQuery.data ?? null;
  const componentMap = component ? buildSingleComponentMap(component) : new Map();

  useEffect(() => {
    if (!component) return;
    setWidget(componentDetailToLayoutWidget(component));
  }, [component]);

  const applyDetail = useCallback((detail: VizComponentDetail) => {
    queryClient.setQueryData(queryKeys.vizComponents.detail(detail.id), detail);
    void queryClient.invalidateQueries({ queryKey: queryKeys.vizComponents.all });
    setWidget(componentDetailToLayoutWidget(detail));
  }, [queryClient]);

  const savePayload = useCallback(
    async (payload: VizComponentPayload, patch?: Partial<LayoutWidget>) => {
      if (!component || !widget) return;
      setSaving(true);
      try {
        const updated = await updateVizComponent(component.id, {
          payloadJson: payload,
          contentRevision: component.contentRevision,
        });
        applyDetail(updated);
        if (patch) {
          setWidget((prev) => (prev ? { ...prev, ...patch } : prev));
        }
      } catch (err) {
        const message = mapApiError(err);
        toast.error(message);
        if (message.includes("contentRevision") || message.includes("冲突")) {
          void detailQuery.refetch();
        }
      } finally {
        setSaving(false);
      }
    },
    [applyDetail, component, detailQuery, widget],
  );

  const saveName = useCallback(
    async (name: string) => {
      if (!component) return;
      setSaving(true);
      try {
        const updated = await updateVizComponent(component.id, {
          name,
          contentRevision: component.contentRevision,
        });
        applyDetail(updated);
        setWidget((prev) => (prev ? { ...prev, title: name } : prev));
      } catch (err) {
        toast.error(mapApiError(err));
      } finally {
        setSaving(false);
      }
    },
    [applyDetail, component],
  );

  const patchWidget = useCallback((patch: Partial<LayoutWidget>) => {
    setWidget((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return {
    component,
    widget,
    componentMap,
    saving,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    refetch: detailQuery.refetch,
    savePayload,
    saveName,
    patchWidget,
  };
}
