import { useState } from "react";
import { Link } from "react-router";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { PublicShareLinkCard } from "@/components/dashboard/PublicShareLinkCard";
import {
  SHARE_FILL_BODY_CLASS,
  SHARE_FILL_CARD_CLASS,
  SHARE_FILL_GRID_CLASS,
  SHARE_FILL_SIDE_STACK_CLASS,
  SHARE_SECTION_CARD_CLASS,
  SHARE_SECTION_CARD_HEADER_CLASS,
  screenPreviewContainerStyle,
} from "@/components/dashboard/sharePageUi";
import { DataScreenPresenter } from "@/components/dashboard/screen/DataScreenPresenter";
import { useScreenAutoRefresh } from "@/components/dashboard/screen/useScreenAutoRefresh";
import { dataScreenPreviewPath } from "@/lib/dataScreenLayout";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { ShareSectionActionRow } from "@/components/dashboard/shareSectionActionRow";
import { ChartEmbedShareActions } from "@/components/dashboard/ChartEmbedShareActions";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { DashboardWidgetBase } from "@/components/dashboard/layoutUtils";
import { cn } from "@/lib/utils";

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
  const previewStyle = screenPreviewContainerStyle(layout);
  const embeddableWidgets = widgets.filter((widget) => chartIdFromWidget(widget));

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
    <div className={SHARE_FILL_BODY_CLASS} data-share-layout="screen">
      <div className={SHARE_FILL_GRID_CLASS}>
        <Card className={cn(SHARE_SECTION_CARD_CLASS, SHARE_FILL_CARD_CLASS)}>
          <CardHeader
            className={cn(
              "flex flex-row items-center justify-between gap-3",
              SHARE_SECTION_CARD_HEADER_CLASS,
            )}
          >
            <CardTitle className="text-theme-base">大屏投放预览</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link to={dataScreenPreviewPath(dashboardId)}>打开全屏预览</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-950 p-2">
              <div className="max-h-full w-full" style={previewStyle}>
                <DataScreenPresenter
                  layout={layout}
                  presentationMode="fit"
                  globalChartRefreshKey={autoRefresh.globalChartRefreshKey}
                  className="h-full w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={SHARE_FILL_SIDE_STACK_CLASS}>
          <PublicShareLinkCard
            dashboardId={dashboardId}
            name={name}
            theme="dark"
            density="compact"
          />

          <Card className={SHARE_SECTION_CARD_CLASS}>
            <CardHeader className={SHARE_SECTION_CARD_HEADER_CLASS}>
              <CardTitle className="text-theme-base">整屏嵌入</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ShareSectionActionRow
                description={
                  <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                    生成带令牌的大屏 iframe 链接，用于 OA / 指挥墙等外部页面嵌入「{name}」。
                  </p>
                }
                actions={
                  screenEmbedUrl ? (
                    <div className="flex max-w-xl flex-col items-end gap-2 text-right">
                      <p className="break-all font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                        {screenEmbedUrl}
                      </p>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(screenEmbedUrl)}
                        >
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
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={issuing}
                      onClick={() => void issueScreenEmbed()}
                    >
                      {issuing ? "签发中…" : "签发整屏嵌入链接"}
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>

          {embeddableWidgets.length > 0 ? (
            <Card className={SHARE_SECTION_CARD_CLASS}>
              <CardHeader className={SHARE_SECTION_CARD_HEADER_CLASS}>
                <CardTitle className="text-theme-base">单组件嵌入</CardTitle>
                <CardDescription>须签发 token 后方可匿名访问</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {embeddableWidgets.map((widget) => {
                  const chartId = chartIdFromWidget(widget);
                  if (!chartId) return null;
                  return (
                    <ShareSectionActionRow
                      key={widget.id}
                      className="border-b border-gray-100 pb-2 last:border-0 last:pb-0 dark:border-gray-800"
                      description={
                        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {widget.title}
                        </p>
                      }
                      actions={
                        <ChartEmbedShareActions chartId={chartId} mode="public" theme="dark" />
                      }
                    />
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
