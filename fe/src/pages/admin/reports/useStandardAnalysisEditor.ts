import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { mapApiError } from "@/lib/apiError";
import { fetchDatasetQueryConfig } from "@/lib/datasetChartBinding";
import {
  type AnalysisPack,
  useStandardPackMutations,
  useStandardPacks,
} from "./useStandardAnalysis";
import { createEmptyAnalysisPack } from "./components/standardAnalysisUi";
import { STANDARD_PACK_QUERY, STANDARD_PANEL_QUERY } from "./standardRoutes";

export type StandardPanelMode = "view" | "settings";

export function buildStandardAnalysisSaveBody(draft: AnalysisPack): AnalysisPack {
  const base = {
    packKey: draft.packKey,
    displayName: draft.displayName,
    dataSourceId: draft.dataSourceId,
    fieldMapping: draft.fieldMapping,
    enabledThemes: draft.enabledThemes,
    allowedRoles: draft.allowedRoles,
    snapshotCronPreset: draft.snapshotCronPreset,
  };
  if (draft.datasetId) {
    return {
      ...base,
      datasetId: draft.datasetId,
      boundConfigId: draft.boundConfigId || undefined,
    };
  }
  return {
    ...base,
    businessObjectCode: draft.businessObjectCode,
    physicalTableFqn: draft.physicalTableFqn,
  };
}

export function useStandardAnalysisEditor(initialPanel?: StandardPanelMode) {
  const [searchParams, setSearchParams] = useSearchParams();
  const packsQuery = useStandardPacks();
  const packs = packsQuery.data?.items ?? [];
  const { upsert, remove } = useStandardPackMutations();

  const panelFromUrl = searchParams.get(STANDARD_PANEL_QUERY);
  const panel: StandardPanelMode =
    panelFromUrl === "settings" || panelFromUrl === "view"
      ? panelFromUrl
      : initialPanel ?? "view";

  const [draft, setDraft] = useState<AnalysisPack>(createEmptyAnalysisPack());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const effectiveBoundConfigId = draft.boundConfigId ?? "";
  const boundConfigQuery = useQuery({
    queryKey: ["reports", "standard-config-bound", effectiveBoundConfigId],
    queryFn: () => fetchDatasetQueryConfig(effectiveBoundConfigId),
    enabled: Boolean(effectiveBoundConfigId),
  });

  const columnOptions = useMemo(
    () => boundConfigQuery.data?.columns ?? [],
    [boundConfigQuery.data?.columns],
  );

  const setPanel = (next: StandardPanelMode) => {
    const params = new URLSearchParams(searchParams);
    params.set(STANDARD_PANEL_QUERY, next);
    setSearchParams(params, { replace: true });
  };

  const selectPack = (packKey: string) => {
    const pack = packs.find((item) => item.packKey === packKey);
    if (!pack) return;
    setIsCreating(false);
    setEditingKey(pack.packKey);
    setDraft(pack);
    const params = new URLSearchParams(searchParams);
    params.set(STANDARD_PACK_QUERY, packKey);
    setSearchParams(params, { replace: true });
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingKey(null);
    setDraft(createEmptyAnalysisPack());
    setPanel("settings");
    const params = new URLSearchParams(searchParams);
    params.delete(STANDARD_PACK_QUERY);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (bootstrapped || isCreating) return;
    const packFromUrl = searchParams.get(STANDARD_PACK_QUERY);
    if (packFromUrl) {
      const pack = packs.find((item) => item.packKey === packFromUrl);
      if (pack) {
        setDraft(pack);
        setEditingKey(pack.packKey);
        setBootstrapped(true);
      }
      return;
    }
    if (panel === "settings" && packs.length > 0 && !editingKey) {
      const initial = packs[0];
      setDraft(initial);
      setEditingKey(initial.packKey);
      setBootstrapped(true);
    }
  }, [bootstrapped, editingKey, isCreating, packs, panel, searchParams]);

  const onSave = async () => {
    if (!draft.packKey.trim()) {
      toast.error("请填写分析包标识");
      return;
    }
    if (!draft.displayName.trim()) {
      toast.error("请填写显示名称");
      return;
    }
    if (!draft.datasetId && !draft.physicalTableFqn) {
      toast.error("请选择数据集");
      return;
    }
    if (draft.datasetId && !draft.boundConfigId) {
      toast.error("请完成数据集查询绑定");
      return;
    }
    if (!draft.dataSourceId) {
      toast.error("数据源未就绪，请确认数据集已绑定查询");
      return;
    }
    if (draft.enabledThemes.length === 0) {
      toast.error("请至少启用一个分析主题");
      return;
    }

    try {
      const body = buildStandardAnalysisSaveBody(draft);
      await upsert.mutateAsync({ packKey: draft.packKey, body });
      setEditingKey(draft.packKey);
      setIsCreating(false);
      setBootstrapped(true);
      setDraft(body);
      selectPack(draft.packKey);
      setPanel("view");
      toast.success("分析包已保存");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  const onDelete = async () => {
    if (!editingKey) return;
    try {
      await remove.mutateAsync(editingKey);
      setDeleteOpen(false);
      const remaining = packs.filter((pack) => pack.packKey !== editingKey);
      if (remaining[0]) {
        selectPack(remaining[0].packKey);
      } else {
        startCreate();
      }
      toast.success("分析包已删除");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  return {
    packsQuery,
    packs,
    panel,
    setPanel,
    draft,
    setDraft,
    editingKey,
    isCreating,
    activePackKey: isCreating ? null : editingKey,
    columnOptions,
    deleteOpen,
    setDeleteOpen,
    selectPack,
    startCreate,
    onSave,
    onDelete,
    upsert,
    remove,
  };
}
