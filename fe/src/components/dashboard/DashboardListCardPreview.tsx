import { LayoutDashboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DashboardLayoutPreview } from "./DashboardLayoutPreview";
import type { DashboardLayout } from "./layoutUtils";

type DashboardListCardPreviewProps = {
  layoutJson?: DashboardLayout;
  className?: string;
};

/**
 * 看板列表卡片真实预览：复用 DashboardLayoutPreview，进入视口后再挂载以控制查询量。
 */
export function DashboardListCardPreview({
  layoutJson,
  className,
}: DashboardListCardPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !layoutJson?.widgets?.length) return;

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
  }, [layoutJson]);

  if (!layoutJson?.widgets?.length) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900/60",
          className,
        )}
      >
        <LayoutDashboard className="size-10 text-gray-300 dark:text-gray-600" aria-hidden />
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={cn(
        "dashboard-canvas-surface dashboard-list-card-preview relative h-full overflow-hidden bg-white dark:bg-gray-900/60",
        className,
      )}
      data-testid="dashboard-list-card-preview"
      aria-hidden
    >
      {active ? (
        <DashboardLayoutPreview
          layout={layoutJson}
          scaleMode="component"
          className="pointer-events-none h-full min-h-0 select-none [&_.pixel-canvas-host]:h-full [&_.pixel-canvas-host]:min-h-0 [&_.pixel-canvas-host]:overflow-hidden"
        />
      ) : (
        <Skeleton className="h-full w-full rounded-none" />
      )}
    </div>
  );
}
