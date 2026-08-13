import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { resolveDatasetChartBinding } from "@/lib/datasetChartBinding";
import { isDemoPackageDataset } from "@/lib/demoPackage";
import { queryKeys } from "@/lib/queryKeys";
import { useInspectorColumns } from "@/hooks/useInspectorColumns";
import type { CustomVizDataBinding, CustomVizWidgetConfig } from "../layoutUtils";
import { customVizBindingToChartConfig } from "./customVizExecute";

type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

export function useCustomVizInspectorState(
  config: CustomVizWidgetConfig,
  onChange: (next: CustomVizWidgetConfig) => void,
) {
  const binding = config.dataBinding ?? { status: "manual" as const };
  const chartCfg = customVizBindingToChartConfig(binding);
  const { columns, loading: columnsLoading, ready: columnsReady, refreshColumns } =
    useInspectorColumns(chartCfg);
  const [datasetBindingError, setDatasetBindingError] = useState<string | null>(null);

  const { data: datasetData, isLoading: datasetsLoading, isError: datasetsError } = useQuery({
    queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DatasetListItem[] }>("/api/v1/datasets?limit=200&offset=0"),
  });

  const datasetItems = datasetData?.items ?? [];
  const datasetsEmpty = !datasetsLoading && !datasetsError && datasetItems.length === 0;

  const patchBinding = useCallback(
    (patch: Partial<CustomVizDataBinding>) => {
      onChange({
        ...config,
        dataBinding: {
          ...binding,
          ...patch,
          status: patch.status ?? binding.status ?? "manual",
        },
      });
    },
    [binding, config, onChange],
  );

  const handleDatasetSelect = useCallback(
    async (datasetId: string) => {
      const ds = datasetItems.find((d) => d.datasetId === datasetId);
      const boundId = ds?.boundConfigId ?? undefined;
      let dataSourceId = binding.dataSourceId;
      if (boundId) {
        try {
          const resolved = await resolveDatasetChartBinding(boundId);
          if (resolved.dataSourceId) dataSourceId = resolved.dataSourceId;
          setDatasetBindingError(null);
        } catch {
          setDatasetBindingError("数据集绑定解析失败，请检查数据集配置");
        }
      } else if (isDemoPackageDataset(datasetId, ds?.displayName)) {
        setDatasetBindingError("官方示例 Dataset 查询配置尚未就绪");
      } else {
        setDatasetBindingError("该 Dataset 尚未绑定查询配置");
      }
      patchBinding({
        datasetId,
        configId: boundId,
        dataSourceId,
        status: "connected",
      });
    },
    [binding.dataSourceId, datasetItems, patchBinding],
  );

  const assignField = useCallback(
    (fieldName: string, kind: "dimension" | "metric") => {
      if (kind === "dimension") {
        const next = [...(binding.dimensions ?? [])];
        if (next.some((d) => d.field === fieldName)) return;
        if (next.length >= 1) next[0] = { field: fieldName };
        else next.push({ field: fieldName });
        patchBinding({ dimensions: next, status: "connected" });
        return;
      }
      const next = [...(binding.metrics ?? [])];
      if (next.some((m) => m.field === fieldName)) return;
      if (next.length >= 1) next[0] = { field: fieldName, agg: "sum" };
      else next.push({ field: fieldName, agg: "sum" });
      patchBinding({ metrics: next, status: "connected" });
    },
    [binding.dimensions, binding.metrics, patchBinding],
  );

  useEffect(() => {
    if (!binding.datasetId || datasetsLoading) return;
    const ds = datasetItems.find((d) => d.datasetId === binding.datasetId);
    const boundId = ds?.boundConfigId;
    if (!boundId || binding.configId === boundId) return;
    void handleDatasetSelect(binding.datasetId);
  }, [binding.configId, binding.datasetId, datasetItems, datasetsLoading, handleDatasetSelect]);

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
  };
}
