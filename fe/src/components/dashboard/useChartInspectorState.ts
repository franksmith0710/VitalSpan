import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { resolveDatasetChartBinding } from "@/lib/datasetChartBinding";
import { queryKeys } from "@/lib/queryKeys";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { useInspectorColumns } from "@/hooks/useInspectorColumns";
import type { LayoutWidget } from "./layoutUtils";
import { defaultChartConfig } from "./layoutUtils";
import { WIDGET_CHART_LABELS } from "./widgetIcons";
import type { SlotTarget } from "./ChartInspectorContext";

type DataSourceListItem = { id: string; name: string; code: string };
type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

function resolveDataMode(cfg: ChartViewConfig): "dataset" | "sql" {
  if (cfg.mode === "sql" || (cfg.sql && cfg.mode !== "dataset")) return "sql";
  return "dataset";
}

function firstEmptyDimension(cfg: ChartViewConfig, min: number): number | null {
  const count = Math.max(min, cfg.dimensions?.length ?? 0);
  for (let i = 0; i < count; i += 1) {
    if (!cfg.dimensions?.[i]?.field) return i;
  }
  return count < min ? 0 : null;
}

function firstEmptyMetric(cfg: ChartViewConfig, min: number): number | null {
  const count = Math.max(min, cfg.metrics?.length ?? 0);
  for (let i = 0; i < count; i += 1) {
    if (!cfg.metrics?.[i]?.field) return i;
  }
  return count < min ? 0 : null;
}

export type ChartInspectorState = ReturnType<typeof useChartInspectorState>;

export function useChartInspectorState(widget: LayoutWidget, onChange: (cfg: ChartViewConfig) => void) {
  const cfg = widget.chartConfig ?? defaultChartConfig("table");
  const { columns, loading: columnsLoading, ready: columnsReady, refreshColumns } = useInspectorColumns(cfg);
  const bindingSyncRef = useRef<string | null>(null);
  const [catalog, setCatalog] = useState<ChartTypeCatalogItem[]>([]);
  const [activeSlot, setActiveSlot] = useState<SlotTarget | null>(null);

  useEffect(() => {
    fetchChartTypeCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const { data: dsData, isLoading: dsLoading } = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DataSourceListItem[] }>("/api/v1/datasources"),
  });

  const {
    data: datasetData,
    isLoading: datasetsLoading,
    isError: datasetsError,
  } = useQuery({
    queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DatasetListItem[] }>("/api/v1/datasets?limit=200&offset=0"),
  });

  const datasetItems = datasetData?.items ?? [];
  const datasourceItems = dsData?.items ?? [];
  const dataMode = resolveDataMode(cfg);
  const selectedDataset = datasetItems.find((d) => d.datasetId === cfg.datasetId);
  const datasetReady = Boolean(cfg.configId && cfg.dataSourceId);
  const datasetsEmpty = !datasetsLoading && !datasetsError && datasetItems.length === 0;
  const datasourcesEmpty = !dsLoading && datasourceItems.length === 0;
  const typeLabel = WIDGET_CHART_LABELS[cfg.chartType] ?? cfg.chartType;
  const chartTypeOptions =
    catalog.length > 0
      ? catalog
      : [{ type: cfg.chartType, displayName: typeLabel } as ChartTypeCatalogItem];

  const handleDatasetSelect = useCallback(
    async (datasetId: string) => {
      const ds = datasetItems.find((d) => d.datasetId === datasetId);
      const boundId = ds?.boundConfigId ?? undefined;
      let dataSourceId = cfg.dataSourceId;

      if (boundId) {
        try {
          const binding = await resolveDatasetChartBinding(boundId);
          if (binding.dataSourceId) dataSourceId = binding.dataSourceId;
        } catch {
          /* keep partial */
        }
      }

      onChange({
        ...cfg,
        mode: "dataset",
        datasetId,
        configId: boundId,
        dataSourceId,
        sql: undefined,
      });
    },
    [cfg, datasetItems, onChange],
  );

  useEffect(() => {
    if (dataMode !== "dataset" || !cfg.datasetId || datasetsLoading) return;

    const ds = datasetItems.find((d) => d.datasetId === cfg.datasetId);
    const boundId = ds?.boundConfigId;
    if (!boundId) return;

    const needsConfig = cfg.configId !== boundId;
    const needsDs = !cfg.dataSourceId;
    if (!needsConfig && !needsDs) {
      bindingSyncRef.current = `${cfg.datasetId}:${boundId}:${cfg.configId}:${cfg.dataSourceId}`;
      return;
    }

    const syncKey = `${cfg.datasetId}:${boundId}:${needsConfig}:${needsDs}`;
    if (bindingSyncRef.current === syncKey) return;

    let cancelled = false;
    void (async () => {
      let dataSourceId = cfg.dataSourceId;
      try {
        const binding = await resolveDatasetChartBinding(boundId);
        if (binding.dataSourceId) dataSourceId = binding.dataSourceId;
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      bindingSyncRef.current = syncKey;
      onChange({
        ...cfg,
        mode: "dataset",
        configId: boundId,
        ...(dataSourceId ? { dataSourceId } : {}),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [dataMode, cfg, datasetItems, datasetsLoading, onChange]);

  const assignField = useCallback(
    (fieldName: string, target?: SlotTarget) => {
      const slot =
        target ??
        activeSlot ??
        (() => {
          const dim = firstEmptyDimension(cfg, 1);
          if (dim != null) return { kind: "dimension" as const, index: dim };
          const met = firstEmptyMetric(cfg, 1);
          if (met != null) return { kind: "metric" as const, index: met };
          return { kind: "metric" as const, index: cfg.metrics?.length ?? 0 };
        })();

      if (slot.kind === "dimension") {
        const dimensions = [...(cfg.dimensions ?? [])];
        while (dimensions.length <= slot.index) dimensions.push({ field: "" });
        dimensions[slot.index] = { field: fieldName };
        onChange({ ...cfg, dimensions });
      } else {
        const metrics = [...(cfg.metrics ?? [])];
        while (metrics.length <= slot.index) metrics.push({ field: "" });
        metrics[slot.index] = { field: fieldName };
        onChange({ ...cfg, metrics });
      }
      setActiveSlot(null);
    },
    [activeSlot, cfg, onChange],
  );

  return {
    widget,
    onChange,
    cfg,
    columns,
    columnsLoading,
    columnsReady,
    refreshColumns,
    catalog: chartTypeOptions,
    dataMode,
    dsLoading,
    datasetsLoading,
    datasetsError,
    datasourceItems,
    datasetItems,
    datasetsEmpty,
    datasourcesEmpty,
    selectedDataset,
    datasetReady,
    handleDatasetSelect,
    activeSlot,
    setActiveSlot,
    assignField,
  };
}
