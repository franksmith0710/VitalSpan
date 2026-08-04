import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Boxes, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import {
  LIST_PAGE_CARD_GRID_CLASS,
  ListPageBody,
  ListPagePagination,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListGhostEmptyState,
  PanelEmptyStateSteps,
} from "@/components/ui/panel-empty-state";
import { VizComponentCard } from "@/components/dashboard/viz-components/VizComponentCard";
import { InsertVizComponentDialog } from "@/components/dashboard/viz-components/InsertVizComponentDialog";
import { ComponentReferencesDialog } from "@/components/dashboard/viz-components/ComponentReferencesDialog";
import { CreateVizComponentButton } from "@/components/dashboard/viz-components/CreateVizComponentDialog";
import {
  VIZ_COMPONENTS_HUB,
  resolveHubWidgetFilter,
  type VizComponentHubWidgetFilter,
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
} from "@/lib/vizComponents";
import { hasCapability } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { useListPagination } from "@/lib/list-pagination";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/auth-context";
import { sessionUserFromMe } from "@/lib/session";
import {
  HUB_CARD_SHELL_CLASS,
  HUB_CARD_SKELETON_BODY_CLASS,
  HUB_CARD_SKELETON_PREVIEW_CLASS,
} from "@/components/dashboard/hubCardUi";
import { cn } from "@/lib/utils";
import { VizComponentsHubFilters } from "./VizComponentsHubFilters";

function ComponentCardSkeleton() {
  return (
    <div className={cn(HUB_CARD_SHELL_CLASS, "shadow-none")}>
      <Skeleton className={cn(HUB_CARD_SKELETON_PREVIEW_CLASS, "rounded-none")} />
      <div className={HUB_CARD_SKELETON_BODY_CLASS}>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-end gap-1">
          <Skeleton className="h-9 w-14" />
          <Skeleton className="h-9 w-12" />
          <Skeleton className="size-9" />
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
  const [widgetFilter, setWidgetFilter] = useState<VizComponentHubWidgetFilter>("all");
  const hubWidgetQuery = resolveHubWidgetFilter(widgetFilter);
  const [q, setQ] = useState("");
  const [insertTarget, setInsertTarget] = useState<VizComponentListItem | null>(null);
  const [referencesTarget, setReferencesTarget] = useState<VizComponentListItem | null>(null);
  const pagination = useListPagination(20, [surfaceTab, widgetFilter, q]);

  const listQuery = useQuery({
    queryKey: queryKeys.vizComponents.list({
      surfaceKind: surfaceTab === "all" ? undefined : surfaceTab,
      widgetType: hubWidgetQuery.widgetType,
      chartPaletteCategory: hubWidgetQuery.chartPaletteCategory,
      q,
      includeDrafts: canManage,
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    queryFn: () =>
      fetchVizComponents({
        surfaceKind: surfaceTab === "all" ? undefined : surfaceTab,
        widgetType: hubWidgetQuery.widgetType,
        chartPaletteCategory: hubWidgetQuery.chartPaletteCategory,
        q: q || undefined,
        includeDrafts: canManage,
        limit: pagination.pageSize,
        offset: pagination.offset,
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
  const total = listQuery.data?.total ?? 0;
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
      layout="list"
      title={VIZ_COMPONENTS_HUB.title}
      icon={
        <AdminPageHeaderIcon>
          <Boxes className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      description={VIZ_COMPONENTS_HUB.description}
      actions={
        <div className="flex items-center gap-2">
          {canCreate ? <CreateVizComponentButton /> : null}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin/viz-templates">{VIZ_COMPONENTS_HUB.layoutTemplates}</Link>
          </Button>
        </div>
      }
    >
      <ListPageSection>
        <ListPageToolbar
          filters={
            <VizComponentsHubFilters
              surfaceTab={surfaceTab}
              widgetFilter={widgetFilter}
              onSurfaceTabChange={(tab) => {
                const next = new URLSearchParams(searchParams);
                if (tab === "all") next.delete("surfaceKind");
                else next.set("surfaceKind", tab);
                setSearchParams(next);
              }}
              onWidgetFilterChange={setWidgetFilter}
            />
          }
          actions={
            <SearchField
              className="w-full sm:max-w-xs"
              value={q}
              onChange={setQ}
              placeholder={VIZ_COMPONENTS_HUB.searchPlaceholder}
              aria-label={VIZ_COMPONENTS_HUB.searchAriaLabel}
            />
          }
        />

        {listQuery.isError ? (
          <ListPageBody>
            <PageErrorBanner
              message={mapApiError(listQuery.error)}
              onRetry={() => void listQuery.refetch()}
            />
          </ListPageBody>
        ) : null}

        <ListPageTableFrame>
          {listQuery.isLoading ? (
            <div className={LIST_PAGE_CARD_GRID_CLASS}>
              {Array.from({ length: 8 }).map((_, i) => (
                <ComponentCardSkeleton key={i} />
              ))}
            </div>
          ) : listQuery.isError ? null : items.length === 0 ? (
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
            <div className={LIST_PAGE_CARD_GRID_CLASS}>
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
            </div>
          )}
        </ListPageTableFrame>

        {!listQuery.isLoading && total > 0 ? (
          <ListPagePagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={total}
            showSizeChanger
            onChange={pagination.onPageChange}
          />
        ) : null}
      </ListPageSection>

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
