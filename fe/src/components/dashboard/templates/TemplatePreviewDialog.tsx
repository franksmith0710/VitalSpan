import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { TemplateLayoutLivePreview } from "@/components/dashboard/templates/TemplateLayoutLivePreview";
import { prepareLayoutForListPreview } from "@/components/dashboard/stylePipeline";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import {
  fetchTemplateDetail,
  type DashboardTemplateListItem,
} from "@/lib/dashboardTemplates";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  bindTemplateDemoDatasource,
  layoutRequiresDemoCharts,
  resolveTemplateDemoDatasourceId,
} from "@/lib/templateDemoData";
import { queryKeys } from "@/lib/queryKeys";
import { surfaceLabel } from "@/components/dashboard/templates/templateLabels";

type TemplatePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DashboardTemplateListItem | null;
};

export function TemplatePreviewDialog({ open, onOpenChange, item }: TemplatePreviewDialogProps) {
  const templateId = item?.id;

  const detailQuery = useQuery({
    queryKey: queryKeys.dashboardTemplates.detail(templateId ?? ""),
    queryFn: () => fetchTemplateDetail(templateId!),
    enabled: open && Boolean(templateId),
    staleTime: 60_000,
  });

  const datasourcesQuery = useQuery({
    queryKey: queryKeys.datasources.list({}),
    queryFn: () =>
      apiFetch<{ items: { id: string; name: string; code: string; database?: string }[] }>(
        "/api/v1/datasources",
      ),
    enabled: open,
    staleTime: 120_000,
  });

  const layout = useMemo(() => {
    const raw = detailQuery.data?.layoutJson as DashboardLayout | undefined;
    if (!raw) return undefined;
    const demoId = resolveTemplateDemoDatasourceId(datasourcesQuery.data?.items ?? []);
    const bound = bindTemplateDemoDatasource(raw, demoId);
    return prepareLayoutForListPreview(bound);
  }, [detailQuery.data, datasourcesQuery.data]);

  const loading = detailQuery.isLoading || datasourcesQuery.isLoading;
  const demoDatasourceMissing =
    !loading &&
    Boolean(layout) &&
    layoutRequiresDemoCharts(layout!) &&
    !resolveTemplateDemoDatasourceId(datasourcesQuery.data?.items ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(92vh,960px)] max-w-[min(96vw,1440px)] flex-col gap-3 p-4 sm:p-5"
        data-testid="template-preview-dialog"
      >
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Eye className="size-5 shrink-0 text-brand-500" aria-hidden />
            <span className="truncate">{item?.name ?? "模板预览"}</span>
          </DialogTitle>
          {item ? (
            <DialogDescription className="line-clamp-2">
              {item.description || `${surfaceLabel(item.surfaceKind)}模板预览`}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40">
          {loading ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : detailQuery.isError ? (
            <div className="flex h-full items-center justify-center p-6">
              <PageErrorBanner
                message={mapApiError(detailQuery.error)}
                onRetry={() => void detailQuery.refetch()}
              />
            </div>
          ) : layout ? (
            <TemplateLayoutLivePreview
              layout={layout}
              surfaceKind={item?.surfaceKind ?? "dashboard"}
              geo3dRenderTier="embed"
              demoDatasourceMissing={demoDatasourceMissing}
              className="h-full"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
