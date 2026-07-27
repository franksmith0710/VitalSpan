import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, LayoutDashboard, Monitor, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { Badge } from "@/components/ui/badge";
import { hasCapability } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import {
  archiveVizComponent,
  deleteVizComponent,
  fetchVizComponents,
  publishVizComponent,
  VIZ_COMPONENT_CATEGORIES,
  type VizComponentListItem,
  type VizSurfaceKind,
} from "@/lib/vizComponents";
import { useAuth } from "@/context/auth-context";
import { sessionUserFromMe } from "@/lib/session";
import { cn } from "@/lib/utils";

const SURFACE_TABS: { id: VizSurfaceKind | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "dashboard", label: "仪表板" },
  { id: "data-screen", label: "数据大屏" },
];

function ComponentCard({
  item,
  canManage,
  onRefresh,
}: {
  item: VizComponentListItem;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const publishMutation = useMutation({
    mutationFn: () => publishVizComponent(item.id),
    onSuccess: () => {
      toast.success("已发布");
      onRefresh();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveVizComponent(item.id),
    onSuccess: () => {
      toast.success("已下架");
      onRefresh();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteVizComponent(item.id),
    onSuccess: () => {
      toast.success("已删除");
      onRefresh();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
          <Boxes className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white/90">
            {item.name}
          </h3>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {item.widgetType} · v{item.contentRevision}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="light" color="light" size="sm">
              {item.status}
            </Badge>
            {item.surfaceKinds.map((sk) => (
              <Badge key={sk} variant="light" color="light" size="sm">
                {sk === "data-screen" ? "大屏" : "看板"}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      {canManage ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.status === "draft" ? (
            <Button
              type="button"
              size="sm"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              发布
            </Button>
          ) : null}
          {item.status === "published" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              下架
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="size-3.5" aria-hidden />
            删除
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function VizComponentsHubPage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "访客", roles: ["viewer"] });
  const canManage = hasCapability(sessionUser, "viz:component.manage");

  const [surfaceTab, setSurfaceTab] = useState<VizSurfaceKind | "all">("all");
  const [q, setQ] = useState("");

  const listQuery = useQuery({
    queryKey: queryKeys.vizComponents.list({
      surfaceKind: surfaceTab === "all" ? undefined : surfaceTab,
      q,
      includeDrafts: canManage,
    }),
    queryFn: () =>
      fetchVizComponents({
        surfaceKind: surfaceTab === "all" ? undefined : surfaceTab,
        q: q || undefined,
        includeDrafts: canManage,
        limit: 50,
      }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.vizComponents.all });
  };

  return (
    <AdminPageShell
      title="可视化组件库"
      description="管理可复用的图表、筛选器与装饰组件；在看板/大屏编辑页通过「复用」插入并自动同步。"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/viz-templates">布局模板</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {SURFACE_TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={surfaceTab === tab.id ? "default" : "outline"}
              onClick={() => setSurfaceTab(tab.id)}
            >
              {tab.id === "dashboard" ? (
                <LayoutDashboard className="mr-1 size-3.5" aria-hidden />
              ) : tab.id === "data-screen" ? (
                <Monitor className="mr-1 size-3.5" aria-hidden />
              ) : null}
              {tab.label}
            </Button>
          ))}
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索组件…"
          className="max-w-md"
          aria-label="搜索组件"
        />
        {listQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : listQuery.isError ? (
          <PageErrorBanner
            message={mapApiError(listQuery.error)}
            onRetry={() => void listQuery.refetch()}
          />
        ) : listQuery.data?.items.length === 0 ? (
          <PanelEmptyState
            title="暂无组件"
            description="在看板编辑页选中组件后，点击「发布到组件库」即可创建。"
          />
        ) : (
          <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3")}>
            {listQuery.data?.items.map((item) => (
              <ComponentCard
                key={item.id}
                item={item}
                canManage={canManage}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          分类：
          {VIZ_COMPONENT_CATEGORIES.map((c) => c.label).join(" · ")}
        </p>
      </div>
    </AdminPageShell>
  );
}
