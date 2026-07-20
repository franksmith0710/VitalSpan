import { useState } from "react";
import { Link } from "react-router";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { DataScreenPresenter } from "@/components/dashboard/screen/DataScreenPresenter";
import { useScreenAutoRefresh } from "@/components/dashboard/screen/useScreenAutoRefresh";
import { dataScreenPreviewPath } from "@/lib/dataScreenLayout";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { DashboardWidgetBase } from "@/components/dashboard/layoutUtils";

type DataScreenSharePanelProps = {
  dashboardId: string;
  name: string;
  layout: DashboardLayout;
};

function chartIdFromWidget(widget: DashboardWidgetBase): string | null {
  if (widget.type === "filter" || !widget.chartConfig) return null;
  const cfg = widget.chartConfig as ChartViewConfig;
  return cfg.chartId ?? widget.id;
}

export function DataScreenSharePanel({ dashboardId, name, layout }: DataScreenSharePanelProps) {
  const [issuing, setIssuing] = useState(false);
  const [screenEmbedUrl, setScreenEmbedUrl] = useState<string | null>(null);
  const refreshIntervalSec = layout.styleConfig?.refreshIntervalSec;
  const autoRefresh = useScreenAutoRefresh({ refreshIntervalSec, enabled: true });
  const widgets = layout.widgets ?? [];

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("已复制链接");
  };

  const issueScreenEmbed = async () => {
    setIssuing(true);
    try {
      const tokenResp = await apiFetch<{ embedUrl: string }>("/api/v1/embed/token", {
        method: "POST",
        body: JSON.stringify({
          dashboardId,
          allowedOrigins: [window.location.origin],
          theme: "dark",
        }),
      });
      setScreenEmbedUrl(`${window.location.origin}${tokenResp.embedUrl}`);
      toast.success("整屏嵌入链接已生成");
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="text-theme-base">大屏投放预览</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to={dataScreenPreviewPath(dashboardId)}>打开全屏预览</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="aspect-video w-full bg-slate-950">
            <DataScreenPresenter
              layout={layout}
              presentationMode="fit"
              globalChartRefreshKey={autoRefresh.globalChartRefreshKey}
              className="h-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="text-theme-base">整屏嵌入</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            生成带令牌的大屏 iframe 链接，用于 OA / 指挥墙等外部页面嵌入「{name}」。
          </p>
          {screenEmbedUrl ? (
            <>
              <p className="break-all font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                {screenEmbedUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => copyUrl(screenEmbedUrl)}>
                  <Copy className="size-4" aria-hidden />
                  复制链接
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={screenEmbedUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" aria-hidden />
                    预览
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <Button type="button" size="sm" variant="primary" disabled={issuing} onClick={() => void issueScreenEmbed()}>
              {issuing ? "签发中…" : "签发整屏嵌入链接"}
            </Button>
          )}
        </CardContent>
      </Card>

      {widgets.some((w) => chartIdFromWidget(w)) ? (
        <Card className="overflow-hidden rounded-2xl border-gray-200 shadow-theme-sm dark:border-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-theme-base">单组件嵌入（次要）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {widgets.map((widget) => {
              const chartId = chartIdFromWidget(widget);
              if (!chartId) return null;
              const embedUrl = `${window.location.origin}/embed/chart/${chartId}`;
              return (
                <div key={widget.id} className="space-y-2 border-b border-gray-100 pb-4 last:border-0 dark:border-gray-800">
                  <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{widget.title}</p>
                  <p className="break-all font-mono text-theme-xs text-gray-500">{embedUrl}</p>
                  <p className="text-theme-xs text-gray-400">须通过嵌入分享页签发 token 后访问。</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
