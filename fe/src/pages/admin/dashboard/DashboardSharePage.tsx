import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { DataScreenSharePanel } from "@/components/dashboard/screen/DataScreenSharePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  dataScreenEditPath,
  isDataScreenAdminPath,
  isDataScreenLayout,
} from "@/lib/dataScreenLayout";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type {
  DashboardLayout,
  DashboardWidgetBase,
} from "@/components/dashboard/layoutUtils";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";

type DashboardDetail = {
  id: string;
  name: string;
  layoutJson: DashboardLayout;
};

function chartIdFromWidget(widget: DashboardWidgetBase): string | null {
  if (widget.type === "filter" || !widget.chartConfig) return null;
  const cfg = widget.chartConfig as ChartViewConfig;
  return cfg.chartId ?? widget.id;
}

export function DashboardSharePage() {
  const { id } = useParams();
  const location = useLocation();
  const [detail, setDetail] = useState<DashboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DashboardDetail>(`/api/v1/dashboards/${id}`);
      setDetail(data);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshSec = detail?.layoutJson?.styleConfig?.refreshIntervalSec;
  const isScreen =
    isDataScreenAdminPath(location.pathname) || isDataScreenLayout(detail?.layoutJson);

  useEffect(() => {
    if (isScreen || !refreshSec || refreshSec < 5) return;
    const timer = window.setInterval(() => {
      void load();
    }, refreshSec * 1000);
    return () => window.clearInterval(timer);
  }, [load, refreshSec, isScreen]);

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("已复制链接");
  };

  const widgets = detail?.layoutJson?.widgets ?? [];
  const editPath = id
    ? isScreen
      ? dataScreenEditPath(id)
      : `/admin/dashboards/${id}/edit`
    : isScreen
      ? "/admin/data-screens"
      : "/admin/dashboards";

  return (
    <AdminPageShell
      title={detail?.name ? `${detail.name} · 分享` : isScreen ? "大屏分享" : "仪表板分享"}
      description={
        isScreen
          ? "整屏投放预览与 iframe 嵌入链接。"
          : "为看板内图表生成可嵌入的外部链接。"
      }
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to={editPath}>返回编辑</Link>
        </Button>
      }
    >
      {error ? <PageErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? <Skeleton className="h-40 w-full" /> : null}
      {!loading && widgets.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {isScreen ? "该大屏暂无组件，请先添加图表。" : "该看板暂无组件，请先添加图表。"}
        </p>
      ) : null}
      {!loading && detail && widgets.length > 0 && isScreen && id ? (
        <DataScreenSharePanel dashboardId={id} name={detail.name} layout={detail.layoutJson} />
      ) : null}
      {!loading && detail && widgets.length > 0 && !isScreen ? (
        <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-theme-base">布局预览</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <DashboardLayoutPreview layout={detail.layoutJson} />
          </CardContent>
        </Card>
      ) : null}
      {!loading && detail && !isScreen ? (
        <div className="mt-4 grid gap-4">
          {widgets.map((widget) => {
            const chartId = chartIdFromWidget(widget);
            const embedUrl = chartId
              ? `${window.location.origin}/embed/chart/${chartId}`
              : null;
            return (
              <Card key={widget.id}>
                <CardHeader>
                  <CardTitle className="text-theme-base">{widget.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {embedUrl ? (
                    <>
                      <p className="break-all font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                        {embedUrl}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(embedUrl)}
                        >
                          <Copy className="size-4" aria-hidden />
                          复制链接
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <a href={embedUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" aria-hidden />
                            预览
                          </a>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-theme-xs text-gray-500">无 chartId，无法生成嵌入链接。</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
      <Card className="mt-4 overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
        <CardHeader className="border-b border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]">
          <CardTitle className="text-theme-base">高级嵌入配置</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            配置来源白名单并生成带校验的 iframe 链接。
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/embed/share">打开嵌入分享</Link>
          </Button>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
