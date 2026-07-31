import { useCallback, useEffect, useState } from "react";
import { LayoutPanelTop } from "lucide-react";
import { DashboardSchedulePanel } from "@/pages/admin/reports/components/DashboardSchedulePanel";
import { DashboardBoardShareBody } from "@/components/dashboard/DashboardBoardShareBody";
import { DataScreenSharePanel } from "@/components/dashboard/screen/DataScreenSharePanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { isDataScreenLayout } from "@/lib/dataScreenLayout";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardDetail = {
  id: string;
  name: string;
  layoutJson: DashboardLayout;
};

export type DashboardShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  isScreen?: boolean;
  /** 编辑页已加载时可传入，避免重复请求 */
  initialDetail?: Pick<DashboardDetail, "name" | "layoutJson">;
};

function ShareDialogSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

export function DashboardShareDialog({
  open,
  onOpenChange,
  dashboardId,
  isScreen: isScreenProp,
  initialDetail,
}: DashboardShareDialogProps) {
  const [detail, setDetail] = useState<DashboardDetail | null>(
    initialDetail
      ? { id: dashboardId, name: initialDetail.name, layoutJson: initialDetail.layoutJson }
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DashboardDetail>(`/api/v1/dashboards/${dashboardId}`);
      setDetail(data);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    if (!open) return;
    if (initialDetail) {
      setDetail({
        id: dashboardId,
        name: initialDetail.name,
        layoutJson: initialDetail.layoutJson,
      });
      setError(null);
      setLoading(false);
      return;
    }
    void load();
  }, [open, initialDetail, dashboardId, load]);

  const layout = detail?.layoutJson;
  const isScreen =
    isScreenProp ?? (layout ? isDataScreenLayout(layout) : false);
  const widgets = layout?.widgets ?? [];
  const title = detail?.name
    ? `${detail.name} · 分享`
    : isScreen
      ? "大屏分享"
      : "仪表板分享";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 p-0 sm:max-w-xl")}>
        <DialogHeader className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
          <DialogTitle className="text-theme-base">{title}</DialogTitle>
          <DialogDescription className="text-theme-xs">
            {isScreen
              ? "生成公开链接与 iframe 嵌入地址，不含画布预览。"
              : "为看板内图表生成公开链接与嵌入地址。"}
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar max-h-[min(72vh,640px)] overflow-y-auto overflow-x-hidden px-5 py-4">
          {error ? (
            <PageErrorBanner message={error} onRetry={() => void load()} className="mb-3" />
          ) : null}
          {loading ? <ShareDialogSkeleton /> : null}

          {!loading && widgets.length === 0 && detail ? (
            <PanelEmptyState
              variant="framed"
              size="sm"
              icon={<LayoutPanelTop className="size-5" aria-hidden />}
              title={isScreen ? "大屏暂无组件" : "看板暂无组件"}
              description={
                isScreen
                  ? "请先在编辑器中添加图表或素材，再生成分享链接。"
                  : "请先在编辑器中添加图表组件，再生成分享链接。"
              }
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  关闭
                </Button>
              }
            />
          ) : null}

          {!loading && detail && widgets.length > 0 ? (
            <div className="flex flex-col gap-4">
              {isScreen ? (
                <DataScreenSharePanel
                  dashboardId={dashboardId}
                  name={detail.name}
                  layout={detail.layoutJson}
                />
              ) : (
                <DashboardBoardShareBody
                  dashboardId={dashboardId}
                  name={detail.name}
                  layout={detail.layoutJson}
                  widgets={widgets}
                />
              )}
              <DashboardSchedulePanel
                sourceId={dashboardId}
                sourceType={isScreen ? "data_screen" : "dashboard"}
                sourceName={detail.name}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
