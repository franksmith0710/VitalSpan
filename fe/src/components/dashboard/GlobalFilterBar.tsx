import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Linkage } from "./dashboardFilterUtils";

type GlobalFilterBarProps = {
  dashboardId: string;
  values: Record<string, string>;
  onChange: (filterId: string, value: string) => void;
};

export function GlobalFilterBar({ dashboardId, values, onChange }: GlobalFilterBarProps) {
  const { data, isError, error } = useQuery({
    queryKey: queryKeys.dashboards.globalFilters(dashboardId),
    queryFn: () => apiFetch<Linkage>(`/api/v1/dashboards/${dashboardId}/global-filters`),
    retry: false,
  });

  if (isError) {
    const code = (error as ApiRequestError)?.code;
    if (code === "GLOBAL_FILTERS_NOT_FOUND" || (error as ApiRequestError)?.message?.includes("404")) {
      return null;
    }
    const status = (error as { status?: number })?.status;
    if (status === 404) return null;
    return null;
  }

  if (!data?.filters?.length) return null;

  return (
    <div className="flex flex-wrap gap-4 border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      {data.filters.map((filter) => (
        <div key={filter.filterId} className="min-w-[140px] flex-1 space-y-1.5 sm:max-w-xs">
          <Label htmlFor={`gf-${filter.filterId}`}>{filter.dimensionRef}</Label>
          <Input
            id={`gf-${filter.filterId}`}
            className="h-10"
            value={values[filter.filterId] ?? filter.defaultValue ?? ""}
            onChange={(e) => onChange(filter.filterId, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export function useGlobalFiltersQuery(dashboardId: string) {
  return useQuery({
    queryKey: queryKeys.dashboards.globalFilters(dashboardId),
    queryFn: () => apiFetch<Linkage>(`/api/v1/dashboards/${dashboardId}/global-filters`),
    retry: false,
  });
}
