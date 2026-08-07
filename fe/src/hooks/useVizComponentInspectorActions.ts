import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { mapApiError } from "@/lib/apiError";
import type { VizComponentMap } from "@/lib/resolveVizComponent";
import {
  pushWidgetPayloadToLibrary,
  relinkWidgetToComponent,
  syncResolvedWidgetToLibrary,
} from "@/lib/vizComponentEdit";
import { isLinkedComponentRef, type VizComponentPayload } from "@/lib/vizComponents";

type UseVizComponentInspectorActionsArgs = {
  primarySelectedId: string | null;
  selectedWidget: LayoutWidget | null;
  resolvedSelectedWidget: LayoutWidget | null;
  componentMap: VizComponentMap;
  setWidgets: React.Dispatch<React.SetStateAction<LayoutWidget[]>>;
  refetchComponents: () => void | Promise<unknown>;
};

export function useVizComponentInspectorActions({
  primarySelectedId,
  selectedWidget,
  resolvedSelectedWidget,
  componentMap,
  setWidgets,
  refetchComponents,
}: UseVizComponentInspectorActionsArgs) {
  const [pushing, setPushing] = useState(false);

  const detach = useCallback(
    (detached: LayoutWidget) => {
      if (!primarySelectedId) return;
      setWidgets((prev) => prev.map((w) => (w.id === primarySelectedId ? detached : w)));
    },
    [primarySelectedId, setWidgets],
  );

  const relink = useCallback(() => {
    const componentId = selectedWidget?.componentRef?.componentId;
    if (!primarySelectedId || !componentId) return;
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === primarySelectedId ? relinkWidgetToComponent(w, componentId) : w,
      ),
    );
  }, [primarySelectedId, selectedWidget?.componentRef?.componentId, setWidgets]);

  const pushToLibrary = useCallback(async () => {
    if (!selectedWidget || !resolvedSelectedWidget) return;
    setPushing(true);
    try {
      await syncResolvedWidgetToLibrary(
        selectedWidget,
        resolvedSelectedWidget,
        componentMap,
      );
      toast.success("已更新到组件库");
      await refetchComponents();
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setPushing(false);
    }
  }, [componentMap, refetchComponents, resolvedSelectedWidget, selectedWidget]);

  const applyPayloadChange = useCallback(
    async (payload: VizComponentPayload, localPatch: Partial<LayoutWidget>) => {
      if (!primarySelectedId || !selectedWidget) return;
      if (isLinkedComponentRef(selectedWidget.componentRef)) {
        try {
          await pushWidgetPayloadToLibrary(selectedWidget, componentMap, payload);
          void refetchComponents();
        } catch (err) {
          toast.error(mapApiError(err));
        }
        return;
      }
      setWidgets((prev) =>
        prev.map((w) => (w.id === primarySelectedId ? { ...w, ...localPatch } : w)),
      );
    },
    [componentMap, primarySelectedId, refetchComponents, selectedWidget, setWidgets],
  );

  return { pushing, detach, relink, pushToLibrary, applyPayloadChange };
}
