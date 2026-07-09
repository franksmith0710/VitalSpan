import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewWidget = {
  colSpan?: number;
  order?: number;
};

type PreviewLayout = {
  widgets?: PreviewWidget[];
};

const PREVIEW_COLORS = [
  "bg-brand-100 dark:bg-brand-500/20",
  "bg-success-50 dark:bg-success-500/15",
  "bg-warning-50 dark:bg-warning-500/15",
  "bg-blue-light-50 dark:bg-blue-light-500/15",
  "bg-orange-50 dark:bg-orange-500/15",
  "bg-gray-100 dark:bg-white/[0.06]",
];

export function DashboardPreviewThumb({
  layoutJson,
  className,
}: {
  layoutJson?: PreviewLayout;
  className?: string;
}) {
  const widgets = [...(layoutJson?.widgets ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  if (widgets.length === 0) {
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
      className={cn(
        "grid h-full grid-cols-12 gap-1.5 bg-gray-50 p-3 dark:bg-gray-900/60",
        className,
      )}
    >
      {widgets.slice(0, 8).map((widget, index) => (
        <div
          key={index}
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
