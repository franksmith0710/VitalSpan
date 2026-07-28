import type { ReactElement, ReactNode } from "react";
import { BarChart3, Filter, Image, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VizWidgetType } from "@/lib/vizComponents";
import { widgetTypeLabel } from "./componentLabels";

const WIDGET_ICONS: Record<VizWidgetType, typeof BarChart3> = {
  chart: BarChart3,
  filter: Filter,
  text: Type,
  media: Image,
};

type ComponentPreviewShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function ComponentPreviewShell({
  children,
  footer,
  className,
}: ComponentPreviewShellProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-white to-brand-50/40",
        "dark:from-gray-950 dark:via-gray-900 dark:to-brand-950/30",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.25) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />
      <div className="relative min-h-0 flex-1 pb-8">{children}</div>
      {footer ? (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 border-t border-white/30 bg-gradient-to-t from-white/80 via-white/50 to-white/0 px-2.5 py-1.5 backdrop-blur-md dark:border-white/10 dark:from-gray-950/80 dark:via-gray-950/50 dark:to-gray-950/0">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function ChartPreviewMock() {
  const heights = [42, 68, 55, 80, 48, 72, 60];
  return (
    <div className="flex h-full items-end justify-center gap-1.5 px-6 pb-4 pt-6">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-3 rounded-t-sm bg-gradient-to-t from-brand-600/90 to-brand-400/70 dark:from-brand-500/80 dark:to-brand-300/50"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function FilterPreviewMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-6">
      <div className="h-2.5 w-16 rounded-full bg-gray-300/80 dark:bg-white/20" />
      <div className="flex h-9 items-center rounded-lg border border-gray-200/80 bg-white/90 px-3 text-theme-xs text-gray-400 shadow-sm dark:border-white/10 dark:bg-gray-900/80">
        请选择…
      </div>
    </div>
  );
}

export function TextPreviewMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      <div className="h-2.5 w-3/4 rounded-full bg-gray-800/70 dark:bg-white/70" />
      <div className="h-2 w-full rounded-full bg-gray-400/50 dark:bg-white/25" />
      <div className="h-2 w-5/6 rounded-full bg-gray-400/40 dark:bg-white/20" />
    </div>
  );
}

export function MediaPreviewMock() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex size-full items-center justify-center rounded-xl border border-dashed border-gray-300/80 bg-white/50 dark:border-white/15 dark:bg-white/[0.04]">
        <Image className="size-10 text-gray-400/70 dark:text-white/30" aria-hidden />
      </div>
    </div>
  );
}

const PREVIEW_BY_TYPE: Record<VizWidgetType, () => ReactElement> = {
  chart: ChartPreviewMock,
  filter: FilterPreviewMock,
  text: TextPreviewMock,
  media: MediaPreviewMock,
};

type PreviewFooterProps = {
  widgetType: VizWidgetType;
  detail?: string;
  trailing?: ReactNode;
};

export function PreviewFooterMeta({ widgetType, detail, trailing }: PreviewFooterProps) {
  const safeType =
    widgetType === "chart" ||
    widgetType === "filter" ||
    widgetType === "text" ||
    widgetType === "media"
      ? widgetType
      : "chart";
  const Icon = WIDGET_ICONS[safeType];

  return (
    <>
      <span className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-gray-600 dark:text-gray-400">
        <Icon className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{widgetTypeLabel(safeType)}</span>
        {detail ? (
          <>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              ·
            </span>
            <span className="truncate text-gray-500 dark:text-gray-500">{detail}</span>
          </>
        ) : null}
      </span>
      {trailing ? (
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-500">
          {trailing}
        </span>
      ) : null}
    </>
  );
}

type ComponentCardPreviewProps = {
  widgetType: VizWidgetType;
  className?: string;
};

export function ComponentCardPreview({ widgetType, className }: ComponentCardPreviewProps) {
  const safeType =
    widgetType === "chart" ||
    widgetType === "filter" ||
    widgetType === "text" ||
    widgetType === "media"
      ? widgetType
      : "chart";
  const Preview = PREVIEW_BY_TYPE[safeType];

  return (
    <ComponentPreviewShell
      className={className}
      footer={<PreviewFooterMeta widgetType={safeType} />}
    >
      <Preview />
    </ComponentPreviewShell>
  );
}
