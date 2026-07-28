import { LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { ComponentPreviewShell } from "@/components/dashboard/viz-components/ComponentCardPreview";
import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";
import { DataScreenPresenter } from "@/components/dashboard/screen/DataScreenPresenter";
import { prepareLayoutForListPreview } from "@/components/dashboard/stylePipeline";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { TemplatePreviewFooter } from "@/components/dashboard/templates/TemplatePreviewFooter";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardTemplateListItem } from "@/lib/dashboardTemplates";
import { fetchTemplateDetail } from "@/lib/dashboardTemplates";
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
}: TemplateCardPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(eager);

  const detailQuery = useQuery({
    queryKey: queryKeys.dashboardTemplates.detail(templateId),
    queryFn: () => fetchTemplateDetail(templateId),
    enabled: active,
    staleTime: 60_000,
  });

  const layout = useMemo(() => {
    const raw = detailQuery.data?.layoutJson as DashboardLayout | undefined;
    return raw ? prepareLayoutForListPreview(raw) : undefined;
  }, [detailQuery.data]);

  const isScreen = surfaceKind === "data-screen";
  const loading = active && detailQuery.isLoading;

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
          <div className="h-full w-full" data-testid="template-card-live-preview">
            {isScreen ? (
              <DataScreenPresenter
                layout={layout}
                presentationMode="fit"
                geo3dRenderTier="thumbnail"
                className="pointer-events-none h-full min-h-0 select-none"
              />
            ) : (
              <DashboardLayoutPreview
                layout={layout}
                scaleMode="component"
                geo3dRenderTier="thumbnail"
                className="pointer-events-none h-full min-h-0 select-none [&_.pixel-canvas-host]:h-full [&_.pixel-canvas-host]:min-h-0 [&_.pixel-canvas-host]:overflow-hidden"
              />
            )}
          </div>
        ) : (
          <Skeleton className="h-full w-full rounded-none" />
        )}
      </ComponentPreviewShell>
    </div>
  );
}
