import type { ReactElement } from "react";
import type { VizComponentPayload, VizWidgetType } from "@/lib/vizComponents";
import { cn } from "@/lib/utils";
import { textConfigToHtml } from "@/components/dashboard/richTextHtml";
import { ComponentCardPreview } from "./ComponentCardPreview";
import { widgetTypeLabel } from "./componentLabels";

type ComponentPayloadPreviewProps = {
  widgetType: VizWidgetType;
  payload?: VizComponentPayload;
  className?: string;
};

function normalizeWidgetType(type: string | undefined): VizWidgetType {
  if (type === "chart" || type === "filter" || type === "text" || type === "media") {
    return type;
  }
  return "chart";
}

function FilterPayloadPreview({ payload }: { payload: VizComponentPayload }) {
  const config = payload.filterConfig;
  if (!config) return null;
  const label = config.dimensionRef || config.filterId;
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-6">
      <p className="truncate text-theme-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <div className="flex h-9 items-center rounded-lg border border-gray-200/80 bg-white/90 px-3 text-theme-xs text-gray-500 shadow-sm dark:border-white/10 dark:bg-gray-900/80 dark:text-gray-400">
        {config.controlType === "date" ? "选择日期…" : "请选择…"}
      </div>
    </div>
  );
}

function TextPayloadPreview({ payload }: { payload: VizComponentPayload }) {
  const config = payload.textConfig;
  if (!config?.content) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-theme-xs text-gray-400">
        空文本
      </div>
    );
  }
  const html = textConfigToHtml(config);
  return (
    <div
      className="prose prose-sm dark:prose-invert h-full max-w-none overflow-hidden p-4 text-gray-800 dark:text-gray-200 [&_*]:!text-[11px] [&_*]:!leading-snug"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function MediaPayloadPreview({ payload }: { payload: VizComponentPayload }) {
  const config = payload.mediaConfig;
  if (!config?.url) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-theme-xs text-gray-400">
        未配置媒体地址
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center p-3">
      <img
        src={config.url}
        alt={config.alt || "媒体预览"}
        className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
        loading="lazy"
      />
    </div>
  );
}

function ChartPayloadPreview({ payload }: { payload: VizComponentPayload }) {
  const chartType = payload.chartConfig?.chartType;
  return (
    <div className="relative h-full w-full">
      <ComponentCardPreview widgetType="chart" className="h-full" />
      {chartType ? (
        <span className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-medium text-gray-600 shadow-sm dark:bg-gray-900/95 dark:text-gray-400">
          {chartType}
        </span>
      ) : null}
    </div>
  );
}

const PAYLOAD_RENDERERS: Record<
  VizWidgetType,
  (payload: VizComponentPayload) => ReactElement | null
> = {
  chart: (payload) => <ChartPayloadPreview payload={payload} />,
  filter: (payload) => <FilterPayloadPreview payload={payload} />,
  text: (payload) => <TextPayloadPreview payload={payload} />,
  media: (payload) => <MediaPayloadPreview payload={payload} />,
};

export function ComponentPayloadPreview({
  widgetType,
  payload,
  className,
}: ComponentPayloadPreviewProps) {
  const safeType = normalizeWidgetType(widgetType);

  if (!payload) {
    return <ComponentCardPreview widgetType={safeType} className={className} />;
  }

  const Preview = PAYLOAD_RENDERERS[safeType];
  const rendered = Preview(payload);

  if (!rendered) {
    return <ComponentCardPreview widgetType={safeType} className={className} />;
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-gradient-to-br from-gray-50 via-white to-brand-50/40",
        "dark:from-gray-950 dark:via-gray-900 dark:to-brand-950/30",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.25) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />
      {rendered}
      <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium text-gray-600 shadow-sm dark:bg-gray-900/90 dark:text-gray-400">
        {widgetTypeLabel(safeType)}
      </span>
    </div>
  );
}
