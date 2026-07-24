import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { DashboardPreviewThumb } from "@/components/dashboard/DashboardPreviewThumb";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTemplateDetail } from "@/lib/dashboardTemplates";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

type TemplateCardPreviewProps = {
  templateId: string;
  thumbnailRef?: string | null;
  surfaceKind: "dashboard" | "data-screen";
  className?: string;
  eager?: boolean;
};

export function TemplateCardPreview({
  templateId,
  thumbnailRef,
  surfaceKind,
  className,
  eager = false,
}: TemplateCardPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(eager || Boolean(thumbnailRef));

  useEffect(() => {
    if (thumbnailRef) {
      setActive(true);
      return undefined;
    }
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
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, templateId, thumbnailRef]);

  const detailQuery = useQuery({
    queryKey: queryKeys.dashboardTemplates.detail(templateId),
    queryFn: () => fetchTemplateDetail(templateId),
    enabled: active && !thumbnailRef,
    staleTime: 60_000,
  });

  const isScreen = surfaceKind === "data-screen";
  const emptyBg = isScreen ? "bg-slate-950" : "bg-gray-50 dark:bg-gray-900/60";

  if (thumbnailRef) {
    return (
      <div
        ref={hostRef}
        className={cn("relative h-full overflow-hidden", emptyBg, className)}
        data-testid="template-card-preview"
      >
        <img
          src={thumbnailRef}
          alt=""
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
      </div>
    );
  }

  const layout = detailQuery.data?.layoutJson as DashboardLayout | undefined;
  const loading = active && detailQuery.isLoading;

  return (
    <div
      ref={hostRef}
      className={cn("relative h-full overflow-hidden", emptyBg, className)}
      data-testid="template-card-preview"
      data-live={active && !loading && layout ? "true" : "false"}
    >
      {active && !loading && layout?.widgets?.length ? (
        <DashboardPreviewThumb
          layoutJson={layout}
          embedded
          isDataScreen={isScreen}
          className="h-full"
        />
      ) : loading ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <LayoutDashboard
            className={cn(
              "size-10",
              isScreen ? "text-slate-600" : "text-gray-300 dark:text-gray-600",
            )}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
