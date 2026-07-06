import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type PrefabBinding = {
  bindingKey: string;
  displayName: string;
  analysisType: string;
  entityTypeCode: string;
  dimensionCodes: string[];
};

export type PrefabRunResult = {
  bindingKey: string;
  analysisType: string;
  renderSpec: {
    sections: Array<{
      kind: string;
      columns: string[];
      rows: unknown[][];
      chartType?: string;
      placeholder?: boolean;
    }>;
  };
  dataSourceId: string;
  status: string;
};

export function usePrefabReports() {
  const bindingsQuery = useQuery({
    queryKey: queryKeys.reports.prefabBindings,
    queryFn: () => apiFetch<{ items: PrefabBinding[]; total: number }>("/api/v1/reports/prefab/bindings"),
  });

  const runMutation = useMutation({
    mutationFn: (bindingKey: string) =>
      apiFetch<PrefabRunResult>(`/api/v1/reports/prefab/bindings/${bindingKey}/run`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
  });

  return { bindingsQuery, runMutation };
}
