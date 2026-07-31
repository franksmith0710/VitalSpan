import { LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboardListCardLayout } from "@/hooks/useDashboardListCardLayout";
import { isDataScreenLayout } from "@/lib/dataScreenLayout";
import { DashboardLayoutPreview } from "./DashboardLayoutPreview";
import { DataScreenPresenter } from "./screen/DataScreenPresenter";
import { prepareLayoutForListPreview } from "./stylePipeline";
import { TemplateGridFitPreview } from "@/components/dashboard/templates/TemplateGridFitPreview";
import type { DashboardLayout } from "./layoutUtils";

type DashboardListCardPreviewProps = {
  dashboardId?: string;
  layoutJson?: DashboardLayout;
  className?: string;
  /** 测试用：跳过后台懒加载，直接挂载真实预览 */
  eager?: boolean;
};

function layoutHasFullChartConfig(layout?: DashboardLayout): boolean {
  if (!layout?.widgets?.length) return false;
  return layout.widgets.some((w) => {
    if (w.type !== "chart") return true;
    const cfg = w.chartConfig;
    if (!cfg) return false;
    return Boolean(
      cfg.dataSourceId ||
        cfg.datasetId ||
        cfg.sql ||
        cfg.table ||
        cfg.bindingId,
    );
  });
}

/**
 * 看板列表卡片真实预览：列表 API 含完整 layoutJson 时直接渲染；
 * 仅 previewSummary 时进入视口后补拉详情。投放路径与预览页 DataScreenPresenter 一致。
 */
export function DashboardListCardPreview({
  dashboardId,
  layoutJson,
  className,
  eager = false,
}: DashboardListCardPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hasFullLayout = layoutHasFullChartConfig(layoutJson);
  const [active, setActive] = useState(eager);
  const shouldFetch = Boolean(dashboardId && !hasFullLayout);
  const layoutQuery = useDashboardListCardLayout(dashboardId, active && shouldFetch);
  const rawLayout = layoutQuery.data ?? layoutJson;
  const resolvedLayout = useMemo(
    () => (rawLayout ? prepareLayoutForListPreview(rawLayout) : undefined),
    [rawLayout],
  );
  const isScreen = isDataScreenLayout(resolvedLayout ?? layoutJson);
  const loading = active && shouldFetch && layoutQuery.isLoading;

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
  }, [eager, dashboardId]);

  if (!resolvedLayout?.widgets?.length && !layoutJson?.widgets?.length) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900/60",
          isScreen && "bg-slate-950",
          className,
        )}
        data-testid="dashboard-list-card-preview"
        aria-hidden
      >
        <LayoutDashboard className="size-10 text-gray-300 dark:text-gray-600" aria-hidden />
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={cn(
        "dashboard-canvas-surface dashboard-list-card-preview relative h-full overflow-hidden",
        isScreen ? "bg-slate-950" : "bg-white dark:bg-gray-900/60",
        "transition-[filter,transform] duration-300 group-hover:scale-[1.02] group-hover:blur-[2px]",
        className,
      )}
      data-testid="dashboard-list-card-preview"
      data-live={active && !loading && resolvedLayout ? "true" : "false"}
      aria-hidden
    >
      {active && !loading && resolvedLayout ? (
        <div className="h-full w-full" data-testid="dashboard-list-card-live-preview">
          {isScreen ? (
            <DataScreenPresenter
              layout={resolvedLayout}
              presentationMode="fill"
              geo3dRenderTier="thumbnail"
              className="pointer-events-none h-full min-h-0 select-none"
            />
          ) : resolvedLayout.version === 1 ? (
            <TemplateGridFitPreview layout={resolvedLayout} fitMode="card">
              <DashboardLayoutPreview
                layout={resolvedLayout}
                scaleMode="component"
                geo3dRenderTier="thumbnail"
                className="pointer-events-none min-h-0 select-none"
              />
            </TemplateGridFitPreview>
          ) : (
            <DashboardLayoutPreview
              layout={resolvedLayout}
              scaleMode="component"
              geo3dRenderTier="thumbnail"
              className="pointer-events-none h-full min-h-0 select-none [&_.pixel-canvas-host]:h-full [&_.pixel-canvas-host]:min-h-0 [&_.pixel-canvas-host]:overflow-hidden"
            />
          )}
        </div>
      ) : (
        <Skeleton className="h-full w-full rounded-none" />
      )}
    </div>
  );
}
