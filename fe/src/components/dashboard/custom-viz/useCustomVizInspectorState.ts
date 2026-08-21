import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { resolveDatasetChartBinding } from "@/lib/datasetChartBinding";
import { isDemoPackageDataset } from "@/lib/demoPackage";
import { queryKeys } from "@/lib/queryKeys";
import { useInspectorColumns } from "@/hooks/useInspectorColumns";
import type { CustomVizDataBinding, CustomVizMetricRef, CustomVizWidgetConfig } from "../layoutUtils";
import { customVizBindingToChartConfig } from "./customVizExecute";
import type { CustomVizFieldTarget } from "./customVizFieldSlots";
import {
  resolveCustomVizSlotLabel,
  validateCustomVizFieldAssignment,
} from "./customVizFieldAssignment";

type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

export function useCustomVizInspectorState(
  readConfig: () => CustomVizWidgetConfig,
  emitChange: (next: CustomVizWidgetConfig) => void,
  fieldSlots?: Record<string, unknown>,
) {
  const config = readConfig();
  const binding = config.dataBinding ?? { status: "manual" as const };
  const chartCfg = customVizBindingToChartConfig(binding);
  const { columns, loading: columnsLoading, ready: columnsReady, refreshColumns } =
    useInspectorColumns(chartCfg);
  const [datasetBindingError, setDatasetBindingError] = useState<string | null>(null);
  const [fieldAssignError, setFieldAssignError] = useState<string | null>(null);
  const bindingSyncRef = useRef<string | null>(null);

  const { data: datasetData, isLoading: datasetsLoading, isError: datasetsError } = useQuery({
    queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DatasetListItem[] }>("/api/v1/datasets?limit=200&offset=0"),
  });

  const datasetItems = datasetData?.items ?? [];
  const datasetsEmpty = !datasetsLoading && !datasetsError && datasetItems.length === 0;

  const patchBinding = useCallback(
    (patch: Partial<CustomVizDataBinding>) => {
      const current = readConfig();
      const currentBinding = current.dataBinding ?? { status: "manual" as const };
      emitChange({
        ...current,
        dataBinding: {
          ...currentBinding,
          ...patch,
          status: patch.status ?? currentBinding.status ?? "manual",
        },
      });
    },
    [emitChange, readConfig],
  );

  const handleDatasetSelect = useCallback(
    async (datasetId: string) => {
      const ds = datasetItems.find((d) => d.datasetId === datasetId);
      const boundId = ds?.boundConfigId ?? undefined;
      const currentBinding = readConfig().dataBinding ?? { status: "manual" as const };
      let dataSourceId = currentBinding.dataSourceId;
      if (boundId) {
        try {
          const resolved = await resolveDatasetChartBinding(boundId);
          if (resolved.dataSourceId) dataSourceId = resolved.dataSourceId;
          setDatasetBindingError(null);
        } catch {
          setDatasetBindingError("数据集绑定解析失败，请检查数据集配置");
        }
      } else if (isDemoPackageDataset(datasetId, ds?.displayName)) {
        setDatasetBindingError(
          "官方示例 Dataset 查询配置尚未就绪，请运行 python scripts/seed-demo-package.py",
        );
      } else {
        setDatasetBindingError("该 Dataset 尚未绑定查询配置，请先在数据集管理中绑定");
      }
      patchBinding({
        datasetId,
        configId: boundId,
        dataSourceId,
        status: "connected",
      });
    },
    [datasetItems, patchBinding, readConfig],
  );

  const assignField = useCallback(
    (fieldName: string, target: CustomVizFieldTarget) => {
      const slotLabel = resolveCustomVizSlotLabel(fieldSlots, target);
      const check = validateCustomVizFieldAssignment(fieldName, target, slotLabel);
      if (!check.ok) {
        setFieldAssignError(check.message);
        return;
      }
      setFieldAssignError(null);
      const currentBinding = readConfig().dataBinding ?? { status: "manual" as const };
      if (target.kind === "dimension") {
        const next = [...(currentBinding.dimensions ?? [])];
        while (next.length <= target.index) next.push({ field: "" });
        if (next.some((d, i) => i !== target.index && d.field === fieldName)) return;
        next[target.index] = { field: fieldName };
        patchBinding({ dimensions: next, status: "connected" });
        return;
      }
      const next = [...(currentBinding.metrics ?? [])];
      while (next.length <= target.index) next.push({ field: "", agg: "sum" });
      if (next.some((m, i) => i !== target.index && m.field === fieldName)) return;
      next[target.index] = { field: fieldName, agg: "sum" } satisfies CustomVizMetricRef;
      patchBinding({ metrics: next, status: "connected" });
    },
    [fieldSlots, patchBinding, readConfig],
  );

  useEffect(() => {
    if (!binding.datasetId || datasetsLoading) return;

    const ds = datasetItems.find((d) => d.datasetId === binding.datasetId);
    const boundId = ds?.boundConfigId;
    if (!boundId) {
      if (isDemoPackageDataset(binding.datasetId, ds?.displayName)) {
        setDatasetBindingError(
          "官方示例 Dataset 查询配置尚未就绪，请运行 python scripts/seed-demo-package.py",
        );
      }
      return;
    }

    const needsConfig = String(binding.configId ?? "") !== String(boundId ?? "");
    const needsDs = !binding.dataSourceId;
    if (!needsConfig && !needsDs) {
      bindingSyncRef.current = `${binding.datasetId}:${boundId}:${binding.configId}:${binding.dataSourceId}`;
      return;
    }

    const syncKey = `${binding.datasetId}:${boundId}:${needsConfig}:${needsDs}`;
    if (bindingSyncRef.current === syncKey) return;

    let cancelled = false;
    void (async () => {
      const currentBinding = readConfig().dataBinding ?? { status: "manual" as const };
      let dataSourceId = currentBinding.dataSourceId;
      try {
        const resolved = await resolveDatasetChartBinding(boundId);
        if (resolved.dataSourceId) dataSourceId = resolved.dataSourceId;
        setDatasetBindingError(null);
      } catch {
        setDatasetBindingError("数据集绑定解析失败，请检查数据集配置");
      }
      if (cancelled) return;

      bindingSyncRef.current = syncKey;
      patchBinding({
        configId: boundId,
        ...(dataSourceId ? { dataSourceId } : {}),
        status: "connected",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    binding.configId,
    binding.dataSourceId,
    binding.datasetId,
    datasetItems,
    datasetsLoading,
    patchBinding,
    readConfig,
  ]);

  useEffect(() => {
    if (columns.length > 0) {
      setDatasetBindingError((prev) =>
        prev === "未加载到字段，请点击刷新或检查数据集查询配置" ? null : prev,
      );
    }
  }, [columns.length]);

  useEffect(() => {
    if (!binding.datasetId || !binding.configId || columnsLoading || columns.length > 0) return;
    if (datasetBindingError) return;
    setDatasetBindingError("未加载到字段，请点击刷新或检查数据集查询配置");
  }, [
    binding.configId,
    binding.datasetId,
    columns.length,
    columnsLoading,
    datasetBindingError,
  ]);

  return {
    binding,
    chartCfg,
    patchBinding,
    handleDatasetSelect,
    assignField,
    columns,
    columnsLoading,
    columnsReady,
    refreshColumns,
    datasetItems,
    datasetsLoading,
    datasetsError,
    datasetsEmpty,
    datasetBindingError,
    fieldAssignError,
    clearFieldAssignError: () => setFieldAssignError(null),
  };
}
