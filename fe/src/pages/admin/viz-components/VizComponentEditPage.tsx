import { Link, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEditRail } from "@/components/dashboard/ChartEditRail";
import { FilterWidgetInspector } from "@/components/dashboard/FilterWidgetInspector";
import { TextEditRail } from "@/components/dashboard/TextEditRail";
import { MediaEditRail } from "@/components/dashboard/MediaEditRail";
import { VizComponentEditLayout } from "@/components/dashboard/viz-components/VizComponentEditLayout";
import { VizComponentLivePreview } from "@/components/dashboard/viz-components/VizComponentLivePreview";
import { widgetTypeLabel } from "@/components/dashboard/viz-components/componentLabels";
import { useVizComponentEditor } from "@/hooks/useVizComponentEditor";
import { mapApiError } from "@/lib/apiError";
import type {
  FilterWidgetConfig,
  MediaWidgetConfig,
  TextWidgetConfig,
} from "@/components/dashboard/layoutUtils";

function EditPageSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 gap-1.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_auto]">
      <Skeleton className="min-h-0 flex-1 rounded-xl" />
      <Skeleton className="h-full w-[432px] shrink-0 rounded-xl" />
    </div>
  );
}

function ComponentEditRail({
  componentId,
  contentRevision,
  widget,
  patchWidget,
}: {
  componentId: string;
  contentRevision: number;
  widget: NonNullable<ReturnType<typeof useVizComponentEditor>["widget"]>;
  patchWidget: ReturnType<typeof useVizComponentEditor>["patchWidget"];
}) {
  if (widget.type === "chart") {
    return (
      <ChartEditRail
        key={`${componentId}-${contentRevision}`}
        className="min-h-0 flex-1"
        widget={widget}
        onTitleChange={(name) => patchWidget({ title: name })}
        onChange={(chartConfig) => patchWidget({ chartConfig })}
      />
    );
  }
  if (widget.type === "filter" && widget.filterConfig) {
    return (
      <FilterWidgetInspector
        embedded
        widget={widget as typeof widget & { filterConfig: FilterWidgetConfig }}
        onChange={(filterConfig) => patchWidget({ filterConfig })}
      />
    );
  }
  if (widget.type === "text" && widget.textConfig) {
    return (
      <TextEditRail
        className="min-h-0 flex-1"
        widget={widget as typeof widget & { textConfig: TextWidgetConfig }}
        onTitleChange={(name) => patchWidget({ title: name })}
        onConfigChange={(textConfig) => patchWidget({ textConfig })}
      />
    );
  }
  if (widget.type === "media" && widget.mediaConfig) {
    return (
      <MediaEditRail
        className="min-h-0 flex-1"
        widget={widget as typeof widget & { mediaConfig: MediaWidgetConfig }}
        onTitleChange={(name) => patchWidget({ title: name })}
        onChange={(mediaConfig) => patchWidget({ mediaConfig })}
      />
    );
  }
  return null;
}

export function VizComponentEditPage() {
  const { id } = useParams<{ id: string }>();
  const {
    component,
    widget,
    saving,
    isDirty,
    isLoading,
    isError,
    error,
    refetch,
    save,
    patchWidget,
  } = useVizComponentEditor(id);

  const title = component?.name ?? "编辑组件";
  const meta = component
    ? `${widgetTypeLabel(component.widgetType)} · v${component.contentRevision}`
    : null;

  const saveStatus = saving ? "保存中…" : isDirty ? "未保存" : "已保存";

  return (
    <AdminPageShell
      layout="fill"
      title={
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Button type="button" variant="ghost" size="sm" className="-ml-1 px-2" asChild>
            <Link to="/admin/viz-components" aria-label="返回组件库">
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
          </Button>
          <h1 className="truncate text-title-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          {meta ? (
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">{meta}</span>
          ) : null}
          <span
            className={
              isDirty
                ? "text-theme-xs text-warning-600 dark:text-warning-400"
                : "text-theme-xs text-gray-400 dark:text-gray-500"
            }
          >
            {saveStatus}
          </span>
        </div>
      }
      titleUnwrapped
      className="min-h-0"
      actions={
        component && widget ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving || !isDirty}
            onClick={() => void save()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <EditPageSkeleton />
      ) : isError ? (
        <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : !component || !widget ? (
        <PageErrorBanner message="组件不存在或无权访问" />
      ) : (
        <VizComponentEditLayout
          preview={<VizComponentLivePreview widget={widget} />}
          rail={
            <ComponentEditRail
              componentId={component.id}
              contentRevision={component.contentRevision}
              widget={widget}
              patchWidget={patchWidget}
            />
          }
        />
      )}
    </AdminPageShell>
  );
}
