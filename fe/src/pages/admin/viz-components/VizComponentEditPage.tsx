import { Link, useParams } from "react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEditRail } from "@/components/dashboard/ChartEditRail";
import { FilterWidgetInspector } from "@/components/dashboard/FilterWidgetInspector";
import { TextEditRail } from "@/components/dashboard/TextEditRail";
import { MediaEditRail } from "@/components/dashboard/MediaEditRail";
import {
  DASHBOARD_EDIT_RAIL_PASS_THROUGH_CLASS,
  DASHBOARD_EDIT_RAIL_SHELL_CLASS,
} from "@/components/dashboard/dashboardEditRailLayout";
import { VizComponentLivePreview } from "@/components/dashboard/viz-components/VizComponentLivePreview";
import { widgetTypeLabel } from "@/components/dashboard/viz-components/componentLabels";
import { useVizComponentEditor } from "@/hooks/useVizComponentEditor";
import { mapApiError } from "@/lib/apiError";
import type {
  FilterWidgetConfig,
  MediaWidgetConfig,
  TextWidgetConfig,
} from "@/components/dashboard/layoutUtils";
import { cn } from "@/lib/utils";

function EditPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <Skeleton className="min-h-[320px] flex-1 rounded-2xl" />
      <Skeleton className="h-full w-[432px] shrink-0 rounded-2xl" />
    </div>
  );
}

export function VizComponentEditPage() {
  const { id } = useParams<{ id: string }>();
  const {
    component,
    widget,
    saving,
    isLoading,
    isError,
    error,
    refetch,
    savePayload,
    saveName,
    patchWidget,
  } = useVizComponentEditor(id);

  const title = component?.name ?? "编辑组件";

  return (
    <AdminPageShell
      layout="fill"
      title={
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="px-2" asChild>
            <Link to="/admin/viz-components" aria-label="返回组件库">
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
          </Button>
          <span className="truncate">{title}</span>
          {saving ? (
            <span className="inline-flex items-center gap-1 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              保存中…
            </span>
          ) : (
            <span className="text-theme-xs font-normal text-gray-500 dark:text-gray-400">
              修改将自动保存到组件库
            </span>
          )}
        </div>
      }
      titleUnwrapped
      description={
        component
          ? `${widgetTypeLabel(component.widgetType)} · v${component.contentRevision}`
          : undefined
      }
      className="min-h-0"
    >
      {isLoading ? (
        <EditPageSkeleton />
      ) : isError ? (
        <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : !component || !widget ? (
        <PageErrorBanner message="组件不存在或无权访问" />
      ) : (
        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            <p className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">实时预览</p>
            <VizComponentLivePreview widget={widget} className="min-h-0 flex-1" />
          </section>

          <aside
            className={cn(
              DASHBOARD_EDIT_RAIL_SHELL_CLASS,
              DASHBOARD_EDIT_RAIL_PASS_THROUGH_CLASS,
              "rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]",
            )}
            data-testid="viz-component-edit-rail"
          >
            {widget.type === "chart" ? (
              <ChartEditRail
                key={`${component.id}-${component.contentRevision}`}
                className="min-h-0 flex-1"
                widget={widget}
                onTitleChange={(name) => {
                  patchWidget({ title: name });
                  void saveName(name);
                }}
                onChange={(chartConfig) => {
                  patchWidget({ chartConfig });
                  void savePayload({ chartConfig });
                }}
              />
            ) : null}
            {widget.type === "filter" && widget.filterConfig ? (
              <FilterWidgetInspector
                embedded
                widget={widget as typeof widget & { filterConfig: FilterWidgetConfig }}
                onChange={(filterConfig) => {
                  patchWidget({ filterConfig });
                  void savePayload({ filterConfig });
                }}
              />
            ) : null}
            {widget.type === "text" && widget.textConfig ? (
              <TextEditRail
                className="min-h-0 flex-1"
                widget={widget as typeof widget & { textConfig: TextWidgetConfig }}
                onTitleChange={(name) => {
                  patchWidget({ title: name });
                  void saveName(name);
                }}
                onConfigChange={(textConfig) => {
                  patchWidget({ textConfig });
                  void savePayload({ textConfig });
                }}
              />
            ) : null}
            {widget.type === "media" && widget.mediaConfig ? (
              <MediaEditRail
                className="min-h-0 flex-1"
                widget={widget as typeof widget & { mediaConfig: MediaWidgetConfig }}
                onTitleChange={(name) => {
                  patchWidget({ title: name });
                  void saveName(name);
                }}
                onChange={(mediaConfig) => {
                  patchWidget({ mediaConfig });
                  void savePayload({ mediaConfig });
                }}
              />
            ) : null}
          </aside>
        </div>
      )}
    </AdminPageShell>
  );
}
