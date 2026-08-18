import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { fetchWithTimeout, getAuthHeaders } from "@/lib/api";
import { resolveApiBaseUrl } from "@/lib/appBasePath";
import { resolveChartQueryLimit } from "@/lib/chartDeDisplay";
import { useChartExecute } from "@/components/charts/useChartExecute";
import { fetchAiVizArtifactMeta } from "@/lib/aiVizArtifacts";
import type { DashboardWidgetShell } from "./dashboardCanvasMode";
import type { LayoutWidget, CustomVizWidgetConfig, DashboardStyleConfig } from "./layoutUtils";
import {
  CUSTOM_VIZ_HOST_CLASS,
  CustomVizHostErrorBoundary,
  customVizHostStyle,
  mountCustomVizHtml,
} from "./customVizHost";
import {
  customVizBindingToChartConfig,
  isCustomVizExecuteReady,
  resolveCustomVizStyle,
} from "./custom-viz/customVizExecute";
import { buildCustomVizRuntimePayload, injectCustomVizPayload } from "./custom-viz/customVizPayload";
import { gridWidgetShellClassName, GridWidgetShellFrame, resolveGridWidgetShell } from "./widgetRailStyleSections";

type CustomVizWidgetProps = {
  widget: LayoutWidget & { customVizConfig: CustomVizWidgetConfig };
  mode: "edit" | "view";
  shell?: DashboardWidgetShell;
  nested?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  dashboardStyle?: DashboardStyleConfig;
  showToolbarDelete?: boolean;
  filterParameters?: Record<string, string>;
  executeKey?: string;
};

export function CustomVizWidget({
  widget,
  mode,
  shell = "grid",
  nested = false,
  selected = false,
  onSelect,
  onDelete: _onDelete,
  onTitleChange: _onTitleChange,
  dashboardStyle,
  showToolbarDelete: _showToolbarDelete = true,
  filterParameters,
  executeKey,
}: CustomVizWidgetProps) {
  const cfg = widget.customVizConfig;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manifestDefaultStyle, setManifestDefaultStyle] = useState<Record<string, unknown>>({});
  const showGridChrome = shell === "grid";
  const gridShell = resolveGridWidgetShell(widget, dashboardStyle);
  const inShapeShell = shell === "shape";
  const hostStyle = customVizHostStyle(dashboardStyle);

  const chartCfg = customVizBindingToChartConfig(cfg.dataBinding);
  const executeReady = isCustomVizExecuteReady(cfg.dataBinding);
  const queryLimit = resolveChartQueryLimit(chartCfg, dashboardStyle ?? {});
  const { columns, rows, loading, error: executeError } = useChartExecute(chartCfg, {
    enabled: executeReady,
    filterParameters,
    executeKey,
    limit: queryLimit,
  });

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setHtml(null);
    const artifactId = cfg.artifactId?.trim();
    if (!artifactId) {
      setLoadError("未配置 artifactId");
      return undefined;
    }
    void (async () => {
      try {
        const apiBase = resolveApiBaseUrl();
        const resp = await fetchWithTimeout(
          `${apiBase}/api/v1/ai-viz/artifacts/${encodeURIComponent(artifactId)}/entry`,
          { headers: { ...getAuthHeaders() } },
        );
        if (!resp.ok) {
          const body = (await resp.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? "加载自定义组件失败");
        }
        const source = await resp.text();
        if (!cancelled) setHtml(source);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "加载自定义组件失败");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg.artifactId]);

  useEffect(() => {
    const artifactId = cfg.artifactId?.trim();
    if (!artifactId) return undefined;
    let cancelled = false;
    void fetchAiVizArtifactMeta(artifactId)
      .then((meta) => {
        if (!cancelled) setManifestDefaultStyle(meta.manifest.defaultStyle ?? {});
      })
      .catch(() => {
        if (!cancelled) setManifestDefaultStyle({});
      });
    return () => {
      cancelled = true;
    };
  }, [cfg.artifactId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !html) return undefined;
    return mountCustomVizHtml(host, html);
  }, [html]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !html) return;
    const style = resolveCustomVizStyle(manifestDefaultStyle, cfg.style);
    injectCustomVizPayload(
      host,
      buildCustomVizRuntimePayload({
        executeReady,
        loading,
        error: executeError,
        columns,
        rows,
        style,
      }),
    );
  }, [
    html,
    columns,
    rows,
    loading,
    executeError,
    executeReady,
    cfg.style,
    manifestDefaultStyle,
  ]);

  const body = loadError ? (
    <div className="flex h-full min-h-[64px] flex-col items-center justify-center gap-1 px-3 text-center text-theme-xs text-gray-500 dark:text-gray-400">
      <span>{loadError}</span>
      {cfg.dataBinding?.status === "manual" ? (
        <span className="text-theme-xs text-gray-400 dark:text-gray-500">数据待手动绑定</span>
      ) : null}
    </div>
  ) : html ? (
    <CustomVizHostErrorBoundary>
      <div
        ref={hostRef}
        data-testid="custom-viz-host"
        className={`${CUSTOM_VIZ_HOST_CLASS} size-full min-h-[64px]`}
        style={hostStyle}
      />
    </CustomVizHostErrorBoundary>
  ) : (
    <div className="flex h-full min-h-[64px] items-center justify-center text-theme-xs text-gray-500 dark:text-gray-400">
      正在加载自定义组件…
    </div>
  );

  if (inShapeShell) {
    return (
      <div className="relative flex size-full min-h-0 flex-col overflow-hidden" onClick={onSelect}>
        {body}
      </div>
    );
  }

  return (
    <GridWidgetShellFrame
      shell={gridShell}
      widgetId={widget.id}
      className={gridWidgetShellClassName(showGridChrome, selected)}
    >
      {showGridChrome && mode === "edit" ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5 dark:border-gray-800 dark:bg-white/[0.04]">
          <div
            className="dashboard-drag-handle flex shrink-0 cursor-grab items-center active:cursor-grabbing"
            role="group"
            aria-label="拖动以移动组件"
          >
            <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
          </div>
          <span className="truncate text-theme-xs font-medium text-gray-700 dark:text-gray-200">{widget.title}</span>
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 p-1">{body}</div>
    </GridWidgetShellFrame>
  );
}

export function isCustomVizConfigReady(config: CustomVizWidgetConfig | undefined): boolean {
  return Boolean(config?.artifactId?.trim());
}
