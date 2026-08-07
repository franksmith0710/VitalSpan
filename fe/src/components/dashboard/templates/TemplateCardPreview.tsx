import { LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { ComponentPreviewShell } from "@/components/dashboard/viz-components/ComponentCardPreview";
import { prepareLayoutForListPreview } from "@/components/dashboard/stylePipeline";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { TemplateLayoutLivePreview } from "@/components/dashboard/templates/TemplateLayoutLivePreview";
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
import { useAdminHeavyRenderSuspended } from "@/hooks/useAdminHeavyRenderSuspended";
import {
  releaseListPreviewSlot,
  requestListPreviewSlot,
} from "@/lib/listPreviewActivation";

type TemplateCardPreviewProps = {
  templateId: string;
  surfaceKind: DashboardTemplateListItem["surfaceKind"];
  className?: string;
  eager?: boolean;
  /** 静态缩略图：仅作加载占位或缺演示库时的回退 */
  thumbnailSrc?: string | null;
  /** 强制 live 布局预览（缺演示库时也不回退静态图） */
  livePreview?: boolean;
};

/** 模板卡片预览区：优先渲染真实布局，元信息由 VizTemplateCard 正文展示。 */
export function TemplateCardPreview({
  templateId,
  surfaceKind,
  className,
  eager = false,
  thumbnailSrc = null,
  livePreview,
}: TemplateCardPreviewProps) {
  const navSuspended = useAdminHeavyRenderSuspended();
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(eager);
  const [slotGranted, setSlotGranted] = useState(eager);

  const detailQuery = useQuery({
    queryKey: queryKeys.dashboardTemplates.detail(templateId),
    queryFn: () => fetchTemplateDetail(templateId),
    enabled: active && slotGranted && !navSuspended,
    staleTime: 60_000,
  });

  const datasourcesQuery = useQuery({
    queryKey: queryKeys.datasources.list({}),
    queryFn: () =>
      apiFetch<{ items: { id: string; name: string; code: string; database?: string }[] }>(
        "/api/v1/datasources",
      ),
    enabled: active && slotGranted && !navSuspended,
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
  /** 有演示库时优先 live 出图；仅仪表板缺数据源时回退静态示意图 */
  const useStaticFallback =
    livePreview !== true &&
    !isScreen &&
    Boolean(thumbnailSrc?.trim()) &&
    demoDatasourceMissing;

  useEffect(() => {
    if (navSuspended) {
      if (!eager) {
        setActive(false);
        setSlotGranted(false);
      }
      return undefined;
    }
    if (!active || slotGranted || eager) return undefined;
    let cancelled = false;
    void requestListPreviewSlot().then(() => {
      if (!cancelled) setSlotGranted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active, slotGranted, eager]);

  useEffect(() => {
    if (!slotGranted || eager) return undefined;
    return () => releaseListPreviewSlot();
  }, [slotGranted, eager]);

  useEffect(() => {
    if (!active || navSuspended) return undefined;
    setChartAnimationSuppressed(true);
    return () => setChartAnimationSuppressed(false);
  }, [active, navSuspended]);

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
        if (navSuspended) return;
        if (entry?.isIntersecting) {
          setActive(true);
        } else {
          setActive(false);
          setSlotGranted(false);
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);

    const syncVisible = () => {
      if (navSuspended) return;
      const rect = el.getBoundingClientRect();
      const margin = 80;
      if (rect.bottom >= -margin && rect.top <= window.innerHeight + margin) {
        setActive(true);
      }
    };
    syncVisible();
    if (!navSuspended) {
      requestAnimationFrame(syncVisible);
    }

    return () => observer.disconnect();
  }, [eager, templateId, navSuspended]);

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

  if (navSuspended) {
    return (
      <div
        ref={hostRef}
        className={cn("h-full", className)}
        data-testid="template-card-preview"
        data-live="false"
        aria-hidden
      >
        <ComponentPreviewShell className="h-full">{thumbnailFallback}</ComponentPreviewShell>
      </div>
    );
  }

  if (useStaticFallback && thumbnailSrc) {
    return (
      <div
        ref={hostRef}
        className={cn("h-full", className)}
        data-testid="template-card-preview"
        data-live="false"
        aria-hidden
      >
        <ComponentPreviewShell className="h-full">{thumbnailFallback}</ComponentPreviewShell>
      </div>
    );
  }

  if (!layout?.widgets?.length && !loading && active && !detailQuery.isLoading) {
    return (
      <div ref={hostRef} className={cn("h-full", className)} data-testid="template-card-preview">
        <ComponentPreviewShell className="h-full">
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
      data-live={active && slotGranted && !loading && layout ? "true" : "false"}
      aria-hidden
    >
      <ComponentPreviewShell className="h-full">
        {active && slotGranted && !loading && layout?.widgets?.length ? (
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
