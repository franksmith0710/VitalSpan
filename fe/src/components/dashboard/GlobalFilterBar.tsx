import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { DashboardStyleConfig } from "./dashboardStyleConfig";
import { resolveFilterControlType, type Linkage } from "./dashboardFilterUtils";
import { FilterControl } from "./FilterWidgetControls";

type GlobalFilterBarProps = {
  dashboardId: string;
  values: Record<string, string>;
  onChange: (filterId: string, value: string) => void;
  dashboardStyle?: DashboardStyleConfig;
};

export function GlobalFilterBar({
  dashboardId,
  values,
  onChange,
  dashboardStyle,
}: GlobalFilterBarProps) {
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

  const labelPosition = dashboardStyle?.filterChromeStyle?.titlePosition ?? "top";
  const labelStyle = dashboardStyle?.filterChromeStyle?.titleColor
    ? { color: dashboardStyle.filterChromeStyle.titleColor }
    : undefined;
  const controlHeight = dashboardStyle?.filterControlStyle?.height;
  const controlRadius = dashboardStyle?.filterControlStyle?.borderRadius;
  const inputStyle = {
    height: controlHeight ? `${controlHeight}px` : undefined,
    borderRadius: controlRadius ? `${controlRadius}px` : undefined,
  };

  return (
    <div className="flex flex-wrap gap-4 border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      {data.filters.map((filter) => {
        const controlType = resolveFilterControlType(filter);
        return (
          <FilterControl
            key={filter.filterId}
            id={`gf-${filter.filterId}`}
            label={filter.dimensionRef}
            controlType={controlType}
            value={values[filter.filterId] ?? filter.defaultValue ?? ""}
            options={filter.options}
            onChange={(next) => onChange(filter.filterId, next)}
            labelPosition={labelPosition}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
          />
        );
      })}
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
