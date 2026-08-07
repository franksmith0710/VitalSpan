import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardWidgetBase } from "@/components/dashboard/dashboardLayoutContracts";
import { isEmbedShareContext } from "@/lib/api";
import { buildComponentMap } from "@/lib/resolveVizComponent";
import { batchResolveVizComponents, collectComponentIds } from "@/lib/vizComponents";
import { queryKeys } from "@/lib/queryKeys";

export function useVizComponentMap(widgets: DashboardWidgetBase[]) {
  const ids = useMemo(() => collectComponentIds(widgets), [widgets]);
  const embedMode = isEmbedShareContext();

  const query = useQuery({
    queryKey: queryKeys.vizComponents.resolve(ids),
    queryFn: () => batchResolveVizComponents(ids),
    enabled: ids.length > 0 && !embedMode,
    staleTime: 30_000,
  });

  const componentMap = useMemo(
    () => buildComponentMap(query.data?.items ?? []),
    [query.data?.items],
  );

  return { componentMap, isLoading: query.isLoading, refetch: query.refetch };
}
