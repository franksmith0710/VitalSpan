import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { LayoutDashboard, LayoutTemplate, Monitor, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { VizTemplateCard } from "@/components/dashboard/templates/VizTemplateCard";
import {
  SURFACE_TABS,
  VIZ_TEMPLATES_HUB,
} from "@/components/dashboard/templates/templateLabels";
import {
  archiveTemplate,
  createFromTemplate,
  fetchDashboardTemplates,
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

function TemplateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
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

  const listQuery = useQuery({
    queryKey: queryKeys.dashboardTemplates.list({
      surfaceKind,
      categoryKey: categoryKey ?? undefined,
      q,
      includeDrafts: canManage,
    }),
    queryFn: () =>
      fetchDashboardTemplates({
        surfaceKind,
        categoryKey: categoryKey ?? undefined,
        q: q || undefined,
        includeDrafts: canManage,
        limit: 100,
      }),
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

  const items = listQuery.data?.items ?? [];

  return (
    <AdminPageShell
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

      <section className="mb-4 flex flex-wrap gap-2">
        {SURFACE_TABS.map((tab) => {
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
        })}
      </section>

      <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={VIZ_TEMPLATES_HUB.searchPlaceholder}
          className="sm:max-w-xs"
          aria-label={VIZ_TEMPLATES_HUB.searchAriaLabel}
        />
        <section className="flex flex-wrap gap-1.5">
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
        </section>
      </section>

      {listQuery.isLoading ? (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </section>
      ) : listQuery.isError ? (
        <PageErrorBanner message={mapApiError(listQuery.error)} onRetry={() => void listQuery.refetch()} />
      ) : items.length === 0 ? (
        <PanelEmptyState
          icon={<LayoutTemplate className="size-8" aria-hidden />}
          title={VIZ_TEMPLATES_HUB.emptyTitle}
          description={VIZ_TEMPLATES_HUB.emptyDescription}
        />
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
          {items.map((item) => (
            <VizTemplateCard
              key={item.id}
              item={item}
              canManage={canManage}
              pending={pending}
              onUse={() => useMutation_.mutate(item)}
              onPublish={() => publishMutation.mutate(item.id)}
              onArchive={() => archiveMutation.mutate(item.id)}
            />
          ))}
        </section>
      )}
    </AdminPageShell>
  );
}
