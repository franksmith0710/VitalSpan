import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Boxes, LayoutDashboard, Monitor, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import {
  ListGhostEmptyState,
  PanelEmptyStateSteps,
} from "@/components/ui/panel-empty-state";
import {
  ChartMountProvider,
  CHART_MOUNT_MAX_LIST,
} from "@/components/charts/ChartMountContext";
import { VizComponentCard } from "@/components/dashboard/viz-components/VizComponentCard";
import { InsertVizComponentDialog } from "@/components/dashboard/viz-components/InsertVizComponentDialog";
import { ComponentReferencesDialog } from "@/components/dashboard/viz-components/ComponentReferencesDialog";
import { CreateVizComponentButton } from "@/components/dashboard/viz-components/CreateVizComponentDialog";
import {
  SURFACE_TABS,
  VIZ_COMPONENTS_HUB,
  WIDGET_TYPE_FILTERS,
} from "@/components/dashboard/viz-components/componentLabels";
import {
  archiveVizComponent,
  batchResolveVizComponents,
  deleteVizComponent,
  fetchVizComponents,
  publishVizComponent,
  type VizComponentListItem,
  type VizComponentPayload,
  type VizSurfaceKind,
  type VizWidgetType,
} from "@/lib/vizComponents";
import { hasCapability } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/auth-context";
import { sessionUserFromMe } from "@/lib/session";

function ComponentCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

const EMPTY_STEPS = [
  {
    step: 1,
    title: "新建或发布组件",
    description: "在 Hub 点击「新建组件」，或在看板/大屏编辑页发布到库。",
    icon: Pencil,
  },
  {
    step: 2,
    title: "发布到组件库",
    description: "选中组件后，在右侧配置栏点击「发布到组件库」。",
    icon: Upload,
  },
  {
    step: 3,
    title: "跨页面复用",
    description: "在其他看板点击工具栏「复用」→ 组织组件库，自动同步更新。",
    icon: Boxes,
  },
] as const;

export function VizComponentsHubPage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "访客", roles: ["viewer"] });
  const canManage = hasCapability(sessionUser, "viz:component.manage");
  const canCreate = hasCapability(sessionUser, "dashboard:edit");

  const [searchParams, setSearchParams] = useSearchParams();
  const surfaceTab =
    (searchParams.get("surfaceKind") as VizSurfaceKind | "all" | null) ?? "all";
  const [widgetType, setWidgetType] = useState<VizWidgetType | "all">("all");
  const [q, setQ] = useState("");
  const [insertTarget, setInsertTarget] = useState<VizComponentListItem | null>(null);
  const [referencesTarget, setReferencesTarget] = useState<VizComponentListItem | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.vizComponents.list({
      surfaceKind: surfaceTab === "all" ? undefined : surfaceTab,
      widgetType: widgetType === "all" ? undefined : widgetType,
      q,
      includeDrafts: canManage,
    }),
    queryFn: () =>
      fetchVizComponents({
        surfaceKind: surfaceTab === "all" ? undefined : surfaceTab,
        widgetType: widgetType === "all" ? undefined : widgetType,
        q: q || undefined,
        includeDrafts: canManage,
        limit: 100,
      }),
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.vizComponents.all });

  const publishMutation = useMutation({
    mutationFn: publishVizComponent,
    onSuccess: () => {
      toast.success(VIZ_COMPONENTS_HUB.toastPublished);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveVizComponent,
    onSuccess: () => {
      toast.success(VIZ_COMPONENTS_HUB.toastArchived);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVizComponent,
    onSuccess: () => {
      toast.success(VIZ_COMPONENTS_HUB.toastDeleted);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const pending =
    publishMutation.isPending || archiveMutation.isPending || deleteMutation.isPending;
  const items = listQuery.data?.items ?? [];
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const resolveQuery = useQuery({
    queryKey: queryKeys.vizComponents.resolve(itemIds),
    queryFn: () => batchResolveVizComponents(itemIds),
    enabled: itemIds.length > 0,
  });

  const payloadById = useMemo(() => {
    const map = new Map<string, VizComponentPayload>();
    for (const detail of resolveQuery.data?.items ?? []) {
      map.set(detail.id, detail.payloadJson);
    }
    return map;
  }, [resolveQuery.data]);

  return (
    <AdminPageShell
      title={VIZ_COMPONENTS_HUB.title}
      description={VIZ_COMPONENTS_HUB.description}
      className="gap-4"
      actions={
        <div className="flex items-center gap-2">
          {canCreate ? <CreateVizComponentButton /> : null}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin/viz-templates">{VIZ_COMPONENTS_HUB.layoutTemplates}</Link>
          </Button>
        </div>
      }
    >
      <section className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {SURFACE_TABS.map((tab) => {
            const Icon =
              tab.key === "data-screen" ? Monitor : tab.key === "dashboard" ? LayoutDashboard : Boxes;
            const active = surfaceTab === tab.key;
            return (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                variant={active ? "primary" : "outline"}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (tab.key === "all") next.delete("surfaceKind");
                  else next.set("surfaceKind", tab.key);
                  setSearchParams(next);
                }}
              >
                <Icon className="size-4" aria-hidden />
                {tab.label}
              </Button>
            );
          })}
          <span
            className="mx-0.5 hidden h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block"
            aria-hidden
          />
          {WIDGET_TYPE_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const active = widgetType === filter.key;
            return (
              <Button
                key={filter.key}
                type="button"
                size="sm"
                variant={active ? "primary" : "ghost"}
                onClick={() => setWidgetType(filter.key)}
              >
                <Icon className="size-3.5" aria-hidden />
                {filter.label}
              </Button>
            );
          })}
        </div>
        <Input
          size="sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={VIZ_COMPONENTS_HUB.searchPlaceholder}
          className="w-full shrink-0 sm:w-auto sm:min-w-[220px] sm:max-w-xs"
          aria-label={VIZ_COMPONENTS_HUB.searchAriaLabel}
        />
      </section>

      {listQuery.isLoading ? (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ComponentCardSkeleton key={i} />
          ))}
        </section>
      ) : listQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(listQuery.error)}
          onRetry={() => void listQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <ListGhostEmptyState
          layout="cards"
          icon={<Boxes className="size-8" aria-hidden />}
          title={VIZ_COMPONENTS_HUB.emptyTitle}
          description={VIZ_COMPONENTS_HUB.emptyDescription}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {canCreate ? <CreateVizComponentButton /> : null}
              <Button type="button" size="sm" variant={canCreate ? "outline" : "primary"} asChild>
                <Link to="/admin/dashboards">{VIZ_COMPONENTS_HUB.goEditDashboard}</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to="/admin/data-screens">{VIZ_COMPONENTS_HUB.goEditDataScreen}</Link>
              </Button>
            </div>
          }
          footer={<PanelEmptyStateSteps steps={EMPTY_STEPS} />}
        />
      ) : (
        <ChartMountProvider maxConcurrent={CHART_MOUNT_MAX_LIST}>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <VizComponentCard
                key={item.id}
                item={item}
                payload={payloadById.get(item.id)}
                payloadLoading={resolveQuery.isLoading && !payloadById.has(item.id)}
                canManage={canManage}
                pending={pending}
                onInsert={() => setInsertTarget(item)}
                onViewReferences={() => setReferencesTarget(item)}
                onPublish={() => publishMutation.mutate(item.id)}
                onArchive={() => archiveMutation.mutate(item.id)}
                onDelete={() => deleteMutation.mutate(item.id)}
              />
            ))}
          </section>
        </ChartMountProvider>
      )}

      <InsertVizComponentDialog
        open={Boolean(insertTarget)}
        onOpenChange={(open) => {
          if (!open) setInsertTarget(null);
        }}
        component={insertTarget}
      />
      <ComponentReferencesDialog
        open={Boolean(referencesTarget)}
        onOpenChange={(open) => {
          if (!open) setReferencesTarget(null);
        }}
        componentId={referencesTarget?.id ?? null}
        componentName={referencesTarget?.name}
      />
    </AdminPageShell>
  );
}
