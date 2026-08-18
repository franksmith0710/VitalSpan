import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type AnalysisTheme = "lifecycle" | "activity" | "trend" | "distribution";
export type SnapshotCronPreset = "daily" | "weekly" | "monthly";

export type FieldMapping = {
  status?: string;
  region?: string;
  createdAt?: string;
};

export type AnalysisPack = {
  packKey: string;
  displayName: string;
  businessObjectCode?: string;
  physicalTableFqn?: string;
  datasetId?: string;
  boundConfigId?: string;
  dataSourceId: string;
  fieldMapping: FieldMapping;
  enabledThemes: AnalysisTheme[];
  allowedRoles: string[];
  snapshotCronPreset: SnapshotCronPreset;
  snapshotRetentionPeriods?: number;
};

export type RunResult = {
  packKey: string;
  theme: AnalysisTheme;
  renderSpec: {
    sections: Array<{
      kind: string;
      columns: Array<{ name: string }>;
      rows: unknown[];
      chartType?: string;
    }>;
  };
  dataSourceId: string;
  status: "ready";
};

export type CompareResult = {
  packKey: string;
  theme: AnalysisTheme;
  currentPeriodKey: string;
  previousPeriodKey: string | null;
  current: { columns: unknown[]; rows: unknown[] };
  previous: { columns: unknown[]; rows: unknown[] } | null;
  deltas: Array<{
    key: string;
    currentValue: number;
    previousValue: number | null;
    delta: number | null;
    deltaPct: number | null;
  }>;
};

export type SnapshotRecord = {
  id: string;
  packKey: string;
  theme: AnalysisTheme;
  periodKind: SnapshotCronPreset;
  periodKey: string;
  capturedAt: string;
};

export function useStandardPacks() {
  return useQuery({
    queryKey: queryKeys.reports.standardPacks,
    queryFn: () => apiFetch<{ items: AnalysisPack[]; total: number }>("/api/v1/reports/standard/packs"),
  });
}

export function useStandardRun(packKey: string | null, theme: AnalysisTheme | null) {
  return useQuery({
    queryKey: queryKeys.reports.standardRun(packKey ?? "", theme ?? ""),
    queryFn: () =>
      apiFetch<RunResult>(`/api/v1/reports/standard/packs/${packKey}/run`, {
        method: "POST",
        body: JSON.stringify({ theme }),
      }),
    enabled: Boolean(packKey && theme),
  });
}

export function useStandardCompare(packKey: string | null, theme: AnalysisTheme | null) {
  return useQuery({
    queryKey: queryKeys.reports.standardCompare(packKey ?? "", theme ?? ""),
    queryFn: () =>
      apiFetch<CompareResult>(
        `/api/v1/reports/standard/packs/${packKey}/compare?theme=${encodeURIComponent(theme ?? "")}`,
      ),
    enabled: Boolean(packKey && theme),
  });
}

export function useStandardSnapshots(packKey: string | null, theme: AnalysisTheme | null) {
  return useQuery({
    queryKey: queryKeys.reports.standardSnapshots(packKey ?? "", theme ?? undefined),
    queryFn: () => {
      const params = new URLSearchParams();
      if (theme) params.set("theme", theme);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      return apiFetch<{ items: SnapshotRecord[]; total: number }>(
        `/api/v1/reports/standard/packs/${packKey}/snapshots${suffix}`,
      );
    },
    enabled: Boolean(packKey),
  });
}

export function useCaptureStandardSnapshot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ packKey, theme }: { packKey: string; theme: AnalysisTheme }) =>
      apiFetch<SnapshotRecord>(
        `/api/v1/reports/standard/packs/${packKey}/snapshots/capture?theme=${encodeURIComponent(theme)}`,
        { method: "POST" },
      ),
    onSuccess: (_data, { packKey, theme }) => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.standardSnapshots(packKey) });
      qc.invalidateQueries({ queryKey: queryKeys.reports.standardSnapshots(packKey, theme) });
      qc.invalidateQueries({ queryKey: queryKeys.reports.standardCompare(packKey, theme) });
    },
  });
}

export function useStandardPackMutations() {
  const qc = useQueryClient();

  const upsert = useMutation({
    mutationFn: ({ packKey, body }: { packKey: string; body: AnalysisPack }) =>
      apiFetch<AnalysisPack>(`/api/v1/reports/standard/packs/${packKey}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (saved) => {
      qc.setQueryData<{ items: AnalysisPack[]; total: number }>(
        queryKeys.reports.standardPacks,
        (prev) => {
          const items = prev?.items ?? [];
          const index = items.findIndex((pack) => pack.packKey === saved.packKey);
          const nextItems =
            index >= 0 ? items.map((pack, i) => (i === index ? saved : pack)) : [...items, saved];
          return { items: nextItems, total: nextItems.length };
        },
      );
    },
  });

  const remove = useMutation({
    mutationFn: (packKey: string) =>
      apiFetch<void>(`/api/v1/reports/standard/packs/${packKey}`, { method: "DELETE" }),
    onSuccess: (_data, packKey) => {
      qc.setQueryData<{ items: AnalysisPack[]; total: number }>(
        queryKeys.reports.standardPacks,
        (prev) => {
          if (!prev) return prev;
          const items = prev.items.filter((pack) => pack.packKey !== packKey);
          return { items, total: items.length };
        },
      );
    },
  });

  return { upsert, remove };
}
