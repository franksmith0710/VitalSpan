import { LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { ComponentPreviewShell } from "@/components/dashboard/viz-components/ComponentCardPreview";
import { prepareLayoutForListPreview } from "@/components/dashboard/stylePipeline";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { TemplateLayoutLivePreview } from "@/components/dashboard/templates/TemplateLayoutLivePreview";
import { TemplatePreviewFooter } from "@/components/dashboard/templates/TemplatePreviewFooter";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardTemplateListItem } from "@/lib/dashboardTemplates";
import { fetchTemplateDetail } from "@/lib/dashboardTemplates";
import { apiFetch } from "@/lib/api";
import {
  bindTemplateDemoDatasource,
  layoutRequiresDemoCharts,
  resolveTemplateDemoDatasourceId,
} from "@/lib/templateDemoData";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

type TemplateCardPreviewProps = {
  templateId: string;
  surfaceKind: DashboardTemplateListItem["surfaceKind"];
  categoryKey: string;
  visibility: DashboardTemplateListItem["visibility"];
  status: DashboardTemplateListItem["status"];
  className?: string;
  eager?: boolean;
  /** 静态缩略图：live 预览加载前展示，避免灰块空壳 */
  thumbnailSrc?: string | null;
};

/**
 * 模板卡片预览：与可视化组件库 ComponentPayloadPreview 同壳层 + 底栏元信息。
 */
export function TemplateCardPreview({
  templateId,
  surfaceKind,
  categoryKey,
  visibility,
  status,
  className,
  eager = false,
  thumbnailSrc = null,
}: TemplateCardPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(eager);

  const detailQuery = useQuery({
    queryKey: queryKeys.dashboardTemplates.detail(templateId),
    queryFn: () => fetchTemplateDetail(templateId),
    enabled: active,
    staleTime: 60_000,
  });

  const datasourcesQuery = useQuery({
    queryKey: queryKeys.datasources.list({}),
    queryFn: () =>
      apiFetch<{ items: { id: string; name: string; code: string; database?: string }[] }>(
        "/api/v1/datasources",
      ),
    enabled: active,
    staleTime: 120_000,
  });

  const layout = useMemo(() => {
    const raw = detailQuery.data?.layoutJson as DashboardLayout | undefined;
    if (!raw) return undefined;
    const demoId = resolveTemplateDemoDatasourceId(datasourcesQuery.data?.items ?? []);
    const bound = bindTemplateDemoDatasource(raw, demoId);
    return prepareLayoutForListPreview(bound);
  }, [detailQuery.data, datasourcesQuery.data]);

  const isScreen = surfaceKind === "data-screen";
  const datasourcesLoading = active && datasourcesQuery.isLoading;
  const loading = active && (detailQuery.isLoading || datasourcesLoading);
  const demoDatasourceId = resolveTemplateDemoDatasourceId(datasourcesQuery.data?.items ?? []);
  const demoDatasourceMissing =
    active &&
    !datasourcesLoading &&
    Boolean(layout) &&
    layoutRequiresDemoCharts(layout!) &&
    !demoDatasourceId;

  useEffect(() => {
    if (!active) return undefined;
    setChartAnimationSuppressed(true);
    return () => setChartAnimationSuppressed(false);
  }, [active]);

  useEffect(() => {
    if (eager) {
      setActive(true);
      return undefined;
    }
    const el = hostRef.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, templateId]);

  const footer = (
    <TemplatePreviewFooter
      surfaceKind={surfaceKind}
      categoryKey={categoryKey}
      visibility={visibility}
      status={status}
    />
  );

  const thumbnailFallback = thumbnailSrc ? (
    <img
      src={thumbnailSrc}
      alt=""
      className="h-full w-full object-cover object-center"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  ) : (
    <Skeleton className="h-full w-full rounded-none" />
  );

  if (!layout?.widgets?.length && !loading && active && !detailQuery.isLoading) {
    return (
      <div ref={hostRef} className={cn("h-full", className)} data-testid="template-card-preview">
        <ComponentPreviewShell footer={footer} className="h-full">
          <div className="flex h-full items-center justify-center">
            <LayoutDashboard
              className={cn("size-10", isScreen ? "text-slate-600" : "text-gray-300 dark:text-gray-600")}
              aria-hidden
            />
          </div>
        </ComponentPreviewShell>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={cn("h-full", className)}
      data-testid="template-card-preview"
      data-live={active && !loading && layout ? "true" : "false"}
      aria-hidden
    >
      <ComponentPreviewShell footer={footer} className="h-full">
        {active && !loading && layout?.widgets?.length ? (
          <TemplateLayoutLivePreview
            layout={layout}
            surfaceKind={surfaceKind}
            variant="card"
            geo3dRenderTier="thumbnail"
            demoDatasourceMissing={demoDatasourceMissing}
          />
        ) : (
          thumbnailFallback
        )}
      </ComponentPreviewShell>
    </div>
  );
}
