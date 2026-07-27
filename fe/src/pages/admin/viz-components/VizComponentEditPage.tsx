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
  saveName,
  savePayload,
}: {
  componentId: string;
  contentRevision: number;
  widget: NonNullable<ReturnType<typeof useVizComponentEditor>["widget"]>;
  patchWidget: ReturnType<typeof useVizComponentEditor>["patchWidget"];
  saveName: ReturnType<typeof useVizComponentEditor>["saveName"];
  savePayload: ReturnType<typeof useVizComponentEditor>["savePayload"];
}) {
  if (widget.type === "chart") {
    return (
      <ChartEditRail
        key={`${componentId}-${contentRevision}`}
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
    );
  }
  if (widget.type === "filter" && widget.filterConfig) {
    return (
      <FilterWidgetInspector
        embedded
        widget={widget as typeof widget & { filterConfig: FilterWidgetConfig }}
        onChange={(filterConfig) => {
          patchWidget({ filterConfig });
          void savePayload({ filterConfig });
        }}
      />
    );
  }
  if (widget.type === "text" && widget.textConfig) {
    return (
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
    );
  }
  if (widget.type === "media" && widget.mediaConfig) {
    return (
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
    isLoading,
    isError,
    error,
    refetch,
    savePayload,
    saveName,
    patchWidget,
  } = useVizComponentEditor(id);

  const title = component?.name ?? "编辑组件";
  const meta = component
    ? `${widgetTypeLabel(component.widgetType)} · v${component.contentRevision}`
    : null;

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
          <span className="inline-flex items-center gap-1 text-theme-xs text-gray-400 dark:text-gray-500">
            {saving ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
            {saving ? "保存中…" : "自动保存"}
          </span>
        </div>
      }
      titleUnwrapped
      className="min-h-0"
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
              saveName={saveName}
              savePayload={savePayload}
            />
          }
        />
      )}
    </AdminPageShell>
  );
}
