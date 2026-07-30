import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LayoutPanelTop } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { DashboardBoardShareBody } from "@/components/dashboard/DashboardBoardShareBody";
import { DataScreenSharePanel } from "@/components/dashboard/screen/DataScreenSharePanel";
import { SHARE_PAGE_SKELETON_CLASS } from "@/components/dashboard/sharePageUi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  dataScreenEditPath,
  isDataScreenAdminPath,
  isDataScreenLayout,
} from "@/lib/dataScreenLayout";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";

type DashboardDetail = {
  id: string;
  name: string;
  layoutJson: DashboardLayout;
};

function SharePageSkeleton() {
  return <Skeleton className={SHARE_PAGE_SKELETON_CLASS} />;
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
      layout="fill"
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
      {loading ? <SharePageSkeleton /> : null}
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
              <Link to={editPath}>
                <ArrowLeft className="size-4" aria-hidden />
                返回编辑
              </Link>
            </Button>
          }
        />
      ) : null}
      {!loading && detail && widgets.length > 0 ? (
        isScreen && id ? (
          <DataScreenSharePanel dashboardId={id} name={detail.name} layout={detail.layoutJson} />
        ) : id ? (
          <DashboardBoardShareBody
            dashboardId={id}
            name={detail.name}
            layout={detail.layoutJson}
            widgets={widgets}
          />
        ) : null
      ) : null}
    </AdminPageShell>
  );
}
