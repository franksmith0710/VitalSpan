import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";

type DashboardDetail = {
  id: string;
  name: string;
  layout: { widgets: LayoutWidget[] };
};

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15">
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function chartIdFromWidget(widget: LayoutWidget): string | null {
  const cfg = widget.chartConfig as ChartViewConfig;
  return cfg.chartId ?? widget.id;
}

export function DashboardSharePage() {
  const { id } = useParams();
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
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("已复制链接");
  };

  const widgets = detail?.layout?.widgets ?? [];

  return (
    <AdminPageShell
      title={detail?.name ? `${detail.name} · 分享` : "Dashboard 分享"}
      description="为看板内图表生成可嵌入的外部链接。"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to={id ? `/admin/dashboards/${id}/edit` : "/admin/dashboards"}>返回编辑</Link>
        </Button>
      }
    >
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? <Skeleton className="h-40 w-full" /> : null}
      {!loading && widgets.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">该看板暂无组件，请先添加图表。</p>
      ) : null}
      <div className="grid gap-4">
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
                      <Button type="button" size="sm" variant="outline" onClick={() => copyUrl(embedUrl)}>
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
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-theme-base">高级嵌入配置</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/embed/share">打开嵌入分享面板</Link>
          </Button>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
