import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { LayoutDashboard, LayoutTemplate, Monitor, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  LIST_PAGE_CARD_GRID_CLASS,
  ListPageBody,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { VizTemplateCard } from "@/components/dashboard/templates/VizTemplateCard";
import {
  GOV_SECTION_LABELS,
  SURFACE_TABS,
  VIZ_TEMPLATES_HUB,
} from "@/components/dashboard/templates/templateLabels";
import {
  archiveTemplate,
  createFromTemplate,
  fetchDashboardTemplates,
  filterTemplatesForHub,
  importTemplateEnvelope,
  publishTemplate,
  TEMPLATE_CATEGORIES,
  type DashboardTemplateListItem,
  type VizLayoutEnvelope,
  type VizSurfaceKind,
} from "@/lib/dashboardTemplates";
import { hasCapability } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { dataScreenEditPath } from "@/lib/dataScreenLayout";
import { useAuth } from "@/context/auth-context";
import { sessionUserFromMe } from "@/lib/session";
import {
  HUB_CARD_SHELL_CLASS,
  HUB_CARD_SKELETON_BODY_CLASS,
  HUB_CARD_SKELETON_PREVIEW_CLASS,
} from "@/components/dashboard/hubCardUi";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  demoPackageStatusQueryKey,
  fetchDemoPackageStatus,
} from "@/lib/demoPackageStatus";

function TemplateCardSkeleton() {
  return (
    <div className={cn(HUB_CARD_SHELL_CLASS, "shadow-none")}>
      <Skeleton className={cn(HUB_CARD_SKELETON_PREVIEW_CLASS, "rounded-none")} />
      <div className={HUB_CARD_SKELETON_BODY_CLASS}>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-1.5">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  );
}

export function VizTemplatesHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "访客", roles: ["viewer"] });
  const canManage = hasCapability(sessionUser, "dashboard:template.manage");
  const canEdit = hasCapability(sessionUser, "dashboard:edit");

  const [searchParams, setSearchParams] = useSearchParams();
  const surfaceKind = (searchParams.get("surfaceKind") as VizSurfaceKind | null) ?? "dashboard";
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  /** 政务模板跨大屏/看板；选「政务」时不按 surfaceKind 过滤，一次展示全部政企模板。 */
  const listSurfaceKind = categoryKey === "government" ? undefined : surfaceKind;

  const listQuery = useQuery({
    queryKey: queryKeys.dashboardTemplates.list({
      surfaceKind: listSurfaceKind,
      categoryKey: categoryKey ?? undefined,
      q,
      includeDrafts: canManage,
    }),
    queryFn: () =>
      fetchDashboardTemplates({
        surfaceKind: listSurfaceKind,
        categoryKey: categoryKey ?? undefined,
        q: q || undefined,
        includeDrafts: canManage,
        limit: 100,
      }),
  });

  const demoStatusQuery = useQuery({
    queryKey: demoPackageStatusQueryKey,
    queryFn: () => fetchDemoPackageStatus(),
    staleTime: 30_000,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTemplates.all });

  const useMutation_ = useMutation({
    mutationFn: (item: DashboardTemplateListItem) => createFromTemplate(item.id, item.name),
    onSuccess: (created, item) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      if (item.surfaceKind === "data-screen") {
        navigate(dataScreenEditPath(created.id));
      } else {
        navigate(`/admin/dashboards/${created.id}/edit`);
      }
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const publishMutation = useMutation({
    mutationFn: publishTemplate,
    onSuccess: () => {
      toast.success(VIZ_TEMPLATES_HUB.toastPublished);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveTemplate,
    onSuccess: () => {
      toast.success(VIZ_TEMPLATES_HUB.toastArchived);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const importMutation = useMutation({
    mutationFn: (envelope: VizLayoutEnvelope) => importTemplateEnvelope(envelope),
    onSuccess: () => {
      toast.success(VIZ_TEMPLATES_HUB.toastImported);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const pending =
    useMutation_.isPending || publishMutation.isPending || archiveMutation.isPending;

  const items = filterTemplatesForHub(listQuery.data?.items ?? []);
  const isGovView = categoryKey === "government";
  const govScreens = isGovView
    ? items.filter((item) => item.surfaceKind === "data-screen")
    : [];
  const govDashboards = isGovView
    ? items.filter((item) => item.surfaceKind === "dashboard")
    : [];

  const renderCardGrid = (gridItems: DashboardTemplateListItem[], eagerCount = 0) => (
    <div className={LIST_PAGE_CARD_GRID_CLASS}>
      {gridItems.map((item, index) => (
        <VizTemplateCard
          key={item.id}
          item={item}
          canManage={canManage}
          pending={pending}
          previewEager={index < eagerCount}
          onUse={() => useMutation_.mutate(item)}
          onPublish={() => publishMutation.mutate(item.id)}
          onArchive={() => archiveMutation.mutate(item.id)}
        />
      ))}
    </div>
  );

  return (
    <AdminPageShell
      layout="list"
      title={VIZ_TEMPLATES_HUB.title}
      description={VIZ_TEMPLATES_HUB.description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="/admin/viz-components">组织组件库</a>
          </Button>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => importRef.current?.click()}
              disabled={importMutation.isPending}
            >
              <Upload className="size-4" />
              {VIZ_TEMPLATES_HUB.importJson}
            </Button>
          ) : null}
        </div>
      }
    >
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const parsed = JSON.parse(String(reader.result ?? "")) as VizLayoutEnvelope;
              importMutation.mutate(parsed);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : VIZ_TEMPLATES_HUB.invalidJson);
            }
          };
          reader.readAsText(file);
        }}
      />

      <ListPageSection>
        <ListPageToolbar
          filters={
            <div className="flex w-full min-w-0 flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {!isGovView
                  ? SURFACE_TABS.map((tab) => {
                      const Icon = tab.key === "data-screen" ? Monitor : LayoutDashboard;
                      const active = surfaceKind === tab.key;
                      return (
                        <Button
                          key={tab.key}
                          type="button"
                          size="sm"
                          variant={active ? "primary" : "outline"}
                          onClick={() => {
                            const next = new URLSearchParams(searchParams);
                            next.set("surfaceKind", tab.key);
                            setSearchParams(next);
                          }}
                        >
                          <Icon className="size-4" />
                          {tab.label}
                        </Button>
                      );
                    })
                  : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={categoryKey === null ? "primary" : "ghost"}
                  onClick={() => setCategoryKey(null)}
                >
                  {VIZ_TEMPLATES_HUB.allCategories}
                </Button>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.key}
                    type="button"
                    size="sm"
                    variant={categoryKey === cat.key ? "primary" : "ghost"}
                    onClick={() => setCategoryKey(cat.key)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
              {isGovView ? (
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {GOV_SECTION_LABELS.hint}
                </p>
              ) : null}
            </div>
          }
          actions={
            <Input
              size="sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={VIZ_TEMPLATES_HUB.searchPlaceholder}
              className="w-full sm:w-auto sm:min-w-[220px]"
              aria-label={VIZ_TEMPLATES_HUB.searchAriaLabel}
            />
          }
        />

        {demoStatusQuery.data ? (
          <ListPageBody className="border-b py-3">
            <Alert severity={demoStatusQuery.data.ready ? "success" : "warning"} banner>
              <AlertTitle>
                {demoStatusQuery.data.ready
                  ? "官方演示数据已就绪"
                  : "官方演示数据尚未就绪"}
              </AlertTitle>
              <AlertDescription>
                {demoStatusQuery.data.ready
                  ? "模板预览与官方示例看板将自动使用「示例数据」数据源。"
                  : demoStatusQuery.data.message ??
                    "请启动 sample-mysql 并检查数据连接中的「示例数据」源。"}
                {!demoStatusQuery.data.ready ? (
                  <>
                    {" "}
                    <Link
                      to="/admin/datasources"
                      className="font-medium text-brand-600 underline dark:text-brand-400"
                    >
                      前往数据连接
                    </Link>
                  </>
                ) : null}
              </AlertDescription>
            </Alert>
          </ListPageBody>
        ) : null}

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
                <TemplateCardSkeleton key={i} />
              ))}
            </div>
          ) : listQuery.isError ? null : items.length === 0 ? (
            <PanelEmptyState
              icon={<LayoutTemplate className="size-8" aria-hidden />}
              title={VIZ_TEMPLATES_HUB.emptyTitle}
              description={VIZ_TEMPLATES_HUB.emptyDescription}
            />
          ) : (
            <>
              {isGovView ? (
                <div className="space-y-8">
                  {govScreens.length > 0 ? (
                    <section>
                      <h2 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                        {GOV_SECTION_LABELS.dataScreen}
                        <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                          ({govScreens.length})
                        </span>
                      </h2>
                      {renderCardGrid(govScreens, 6)}
                    </section>
                  ) : null}
                  {govDashboards.length > 0 ? (
                    <section>
                      <h2 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                        {GOV_SECTION_LABELS.dashboard}
                        <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                          ({govDashboards.length})
                        </span>
                      </h2>
                      {renderCardGrid(govDashboards, 6)}
                    </section>
                  ) : null}
                </div>
              ) : (
                renderCardGrid(items, 4)
              )}
              <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
                共 {items.length} 个模板
              </p>
            </>
          )}
        </ListPageTableFrame>
      </ListPageSection>
    </AdminPageShell>
  );
}
