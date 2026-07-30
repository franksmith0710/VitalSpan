import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LayoutPanelTop } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { DataScreenSharePanel } from "@/components/dashboard/screen/DataScreenSharePanel";
import { PublicShareLinkCard } from "@/components/dashboard/PublicShareLinkCard";
import { ChartEmbedShareActions } from "@/components/dashboard/ChartEmbedShareActions";
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
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";

const SHARE_CARD_HEADER_CLASS =
  "border-b border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.02]";

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

  const isScreenPath = isDataScreenAdminPath(location.pathname);
  const refreshSec = detail?.layoutJson?.styleConfig?.refreshIntervalSec;
  const isScreen = isScreenPath || isDataScreenLayout(detail?.layoutJson);

  useEffect(() => {
    if (isScreen || !refreshSec || refreshSec < 5) return;
    const timer = window.setInterval(() => {
      void load();
    }, refreshSec * 1000);
    return () => window.clearInterval(timer);
  }, [load, refreshSec, isScreen]);

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
          <Link to={editPath}>
            <ArrowLeft className="size-4" aria-hidden />
            返回编辑
          </Link>
        </Button>
      }
    >
      {error ? <PageErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? (
        <Skeleton
          className={
            isScreenPath
              ? "min-h-[min(70vh,720px)] w-full rounded-2xl"
              : "h-40 w-full rounded-2xl"
          }
        />
      ) : null}
      {!loading && widgets.length === 0 ? (
        <PanelEmptyState
          variant="framed"
          size="md"
          icon={<LayoutPanelTop className="size-6" aria-hidden />}
          title={isScreen ? "大屏暂无组件" : "看板暂无组件"}
          description={
            isScreen
              ? "请先在编辑器中添加图表或素材，再生成分享与嵌入链接。"
              : "请先在编辑器中添加图表组件，再生成分享与嵌入链接。"
          }
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={editPath}>返回编辑</Link>
            </Button>
          }
        />
      ) : null}
      {!loading && detail && widgets.length > 0 && isScreen && id ? (
        <div className="space-y-6">
          <DataScreenSharePanel dashboardId={id} name={detail.name} layout={detail.layoutJson} />
          <PublicShareLinkCard dashboardId={id} name={detail.name} theme="dark" />
        </div>
      ) : null}
      {!loading && detail && widgets.length > 0 && !isScreen && id ? (
        <PublicShareLinkCard dashboardId={id} name={detail.name} />
      ) : null}
      {!loading && detail && widgets.length > 0 && !isScreen ? (
        <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
          <CardHeader className={SHARE_CARD_HEADER_CLASS}>
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
            return (
              <Card
                key={widget.id}
                className="overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800"
              >
                <CardHeader className={SHARE_CARD_HEADER_CLASS}>
                  <CardTitle className="text-theme-base">{widget.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {chartId ? (
                    <>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                        单组件链接须签发 token 后方可匿名访问。
                      </p>
                      <ChartEmbedShareActions chartId={chartId} mode="public" />
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
      {!isScreen ? (
        <Card className="mt-4 overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
          <CardHeader className={SHARE_CARD_HEADER_CLASS}>
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
      ) : null}
    </AdminPageShell>
  );
}
