import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { Archive, LayoutDashboard, LayoutTemplate, Monitor, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
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

function surfaceLabel(kind: VizSurfaceKind) {
  return kind === "data-screen" ? "????" : "???";
}

function TemplateCard({
  item,
  canManage,
  onUse,
  onPublish,
  onArchive,
  pending,
}: {
  item: DashboardTemplateListItem;
  canManage: boolean;
  onUse: () => void;
  onPublish: () => void;
  onArchive: () => void;
  pending: boolean;
}) {
  return (
    <Card className="shadow-theme-xs">
      <CardHeader className="space-y-2 pb-2">
        <header className="flex items-start justify-between gap-2">
          <CardTitle className="text-theme-sm font-semibold leading-snug">{item.name}</CardTitle>
          <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
            {surfaceLabel(item.surfaceKind)}
          </span>
        </header>
        {item.description ? (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">{item.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Button type="button" size="sm" variant="primary" disabled={pending} onClick={onUse}>
          ?????
        </Button>
        {canManage && item.status === "draft" ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onPublish}>
            ??
          </Button>
        ) : null}
        {canManage && item.status === "published" && item.visibility !== "builtin" ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onArchive}>
            <Archive className="size-3.5" />
            ??
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function VizTemplatesHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "??", roles: ["viewer"] });
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
      toast.success("?????");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveTemplate,
    onSuccess: () => {
      toast.success("?????");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const importMutation = useMutation({
    mutationFn: (envelope: VizLayoutEnvelope) => importTemplateEnvelope(envelope),
    onSuccess: () => {
      toast.success("????????");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const pending =
    useMutation_.isPending || publishMutation.isPending || archiveMutation.isPending;

  const items = listQuery.data?.items ?? [];

  const surfaceTabs: { key: VizSurfaceKind; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "???", icon: LayoutDashboard },
    { key: "data-screen", label: "????", icon: Monitor },
  ];

  return (
    <AdminPageShell
      title="?????"
      description="????????????????????????????????????"
      actions={
        canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => importRef.current?.click()}
            disabled={importMutation.isPending}
          >
            <Upload className="size-4" />
            ?? JSON
          </Button>
        ) : null
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
              toast.error(err instanceof Error ? err.message : "?????? JSON");
            }
          };
          reader.readAsText(file);
        }}
      />

      <section className="mb-4 flex flex-wrap gap-2">
        {surfaceTabs.map((tab) => {
          const Icon = tab.icon;
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
          placeholder="?????"
          className="sm:max-w-xs"
          aria-label="????"
        />
        <section className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={categoryKey === null ? "primary" : "ghost"}
            onClick={() => setCategoryKey(null)}
          >
            ????
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
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </section>
      ) : listQuery.isError ? (
        <PageErrorBanner message={mapApiError(listQuery.error)} onRetry={() => void listQuery.refetch()} />
      ) : items.length === 0 ? (
        <PanelEmptyState
          icon={<LayoutTemplate className="size-8" aria-hidden />}
          title="????"
          description="??????????????????? JSON ?????"
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <TemplateCard
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
