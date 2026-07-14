import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardLayout, DashboardLayoutV2 } from "./layoutUtils";

const PREVIEW_COLORS = [
  "bg-brand-100 dark:bg-brand-500/20",
  "bg-success-50 dark:bg-success-500/15",
  "bg-warning-50 dark:bg-warning-500/15",
  "bg-blue-light-50 dark:bg-blue-light-500/15",
  "bg-orange-50 dark:bg-orange-500/15",
  "bg-gray-100 dark:bg-white/[0.06]",
];

/** 列表卡片预览区固定比例（与 Skeleton 一致，避免 canvas 动态高度牵动整行） */
export const DASHBOARD_LIST_CARD_ASPECT_RATIO = "16 / 10";

/** 独立缩略图容器纵横比：v2 跟随 canvas，v1 保持 16:10。列表卡片请用 DASHBOARD_LIST_CARD_ASPECT_RATIO。 */
export function dashboardPreviewAspectRatio(layoutJson?: DashboardLayout): string {
  if (layoutJson?.version === 2) {
    const { width, height } = layoutJson.canvas;
    return `${width} / ${height}`;
  }
  return "16 / 10";
}

export function DashboardPreviewThumb({
  layoutJson,
  className,
  embedded = false,
}: {
  layoutJson?: DashboardLayout;
  className?: string;
  /** 列表卡片等外层已设 aspect-ratio 时为 true */
  embedded?: boolean;
}) {
  if (!layoutJson || layoutJson.widgets.length === 0) {
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

  if (layoutJson.version === 2) {
    const canvasLayout = layoutJson as DashboardLayoutV2;
    const widgets = [...canvasLayout.widgets].sort(
      (a, b) => a.order - b.order,
    );
    return (
      <div
        data-testid="dashboard-preview-thumb"
        className={cn(
          "relative h-full overflow-hidden bg-gray-50 p-3 dark:bg-gray-900/60",
          className,
        )}
        style={
          embedded ? undefined : { aspectRatio: dashboardPreviewAspectRatio(canvasLayout) }
        }
      >
        <div className="relative h-full w-full">
          {widgets.slice(0, 8).map((widget, index) => (
            <div
              key={widget.id}
              data-testid={`dashboard-preview-widget-${widget.id}`}
              className={cn(
                "absolute rounded-sm",
                PREVIEW_COLORS[index % PREVIEW_COLORS.length],
              )}
              style={{
                left: `${(widget.x / canvasLayout.canvas.width) * 100}%`,
                top: `${(widget.y / canvasLayout.canvas.height) * 100}%`,
                width: `${(widget.width / canvasLayout.canvas.width) * 100}%`,
                height: `${(widget.height / canvasLayout.canvas.height) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const widgets = [...layoutJson.widgets].sort(
    (a, b) => a.order - b.order,
  );
  return (
    <div
      className={cn(
        "grid h-full grid-cols-12 gap-1.5 bg-gray-50 p-3 dark:bg-gray-900/60",
        className,
      )}
    >
      {widgets.slice(0, 8).map((widget, index) => (
        <div
          key={widget.id}
          data-testid={`dashboard-preview-widget-${widget.id}`}
          className={cn(
            "h-5 rounded-sm",
            PREVIEW_COLORS[index % PREVIEW_COLORS.length],
          )}
          style={{ gridColumn: `span ${Math.min(widget.colSpan ?? 6, 12)}` }}
        />
      ))}
    </div>
  );
}
