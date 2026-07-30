import { Link } from "react-router";
import { ChartEmbedShareActions } from "@/components/dashboard/ChartEmbedShareActions";
import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";
import { PublicShareLinkCard } from "@/components/dashboard/PublicShareLinkCard";
import { ShareSectionActionRow } from "@/components/dashboard/shareSectionActionRow";
import {
  SHARE_FILL_BODY_CLASS,
  SHARE_FILL_CARD_BODY_CLASS,
  SHARE_FILL_CARD_CLASS,
  SHARE_FILL_SIDE_STACK_CLASS,
  SHARE_PREVIEW_CARD_CLASS,
  SHARE_PREVIEW_STACKED_MAX_CLASS,
  SHARE_SECTION_CARD_CLASS,
  SHARE_SECTION_CARD_HEADER_CLASS,
  SHARE_SPLIT_CONFIG_COLUMN_CLASS,
  SHARE_SPLIT_GRID_CLASS,
  SHARE_SPLIT_PREVIEW_COLUMN_CLASS,
} from "@/components/dashboard/sharePageUi";
import type { DashboardLayout, DashboardWidgetBase } from "@/components/dashboard/layoutUtils";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardBoardShareBodyProps = {
  dashboardId: string;
  name: string;
  layout: DashboardLayout;
  widgets: DashboardWidgetBase[];
};

function chartIdFromWidget(widget: DashboardWidgetBase): string | null {
  if (widget.type === "filter" || !widget.chartConfig) return null;
  const cfg = widget.chartConfig as ChartViewConfig;
  return cfg.chartId ?? widget.id;
}

export function DashboardBoardShareBody({
  dashboardId,
  name,
  layout,
  widgets,
}: DashboardBoardShareBodyProps) {
  const embeddableWidgets = widgets.filter((widget) => chartIdFromWidget(widget));

  return (
    <div className={SHARE_FILL_BODY_CLASS} data-share-layout="board">
      <div className={SHARE_SPLIT_GRID_CLASS}>
        <div className={SHARE_SPLIT_PREVIEW_COLUMN_CLASS}>
          <Card className={cn(SHARE_PREVIEW_CARD_CLASS, SHARE_FILL_CARD_CLASS, "h-full min-h-0")}>
            <CardHeader className={SHARE_SECTION_CARD_HEADER_CLASS}>
              <CardTitle className="text-theme-base">布局预览</CardTitle>
            </CardHeader>
            <CardContent className={SHARE_FILL_CARD_BODY_CLASS}>
              <div
                className={cn(
                  "overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800",
                  SHARE_PREVIEW_STACKED_MAX_CLASS,
                )}
              >
                <DashboardLayoutPreview layout={layout} className="h-full min-h-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={SHARE_SPLIT_CONFIG_COLUMN_CLASS}>
          <div className={SHARE_FILL_SIDE_STACK_CLASS}>
            <PublicShareLinkCard
              dashboardId={dashboardId}
              name={name}
              density="compact"
              className="shrink-0"
            />

            {embeddableWidgets.length > 0 ? (
              <Card className={cn(SHARE_SECTION_CARD_CLASS, "shrink-0")}>
                <CardHeader className={SHARE_SECTION_CARD_HEADER_CLASS}>
                  <CardTitle className="text-theme-base">单组件嵌入</CardTitle>
                  <CardDescription>须签发 token 后方可匿名访问</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {embeddableWidgets.map((widget) => {
                    const chartId = chartIdFromWidget(widget);
                    if (!chartId) return null;
                    return (
                      <div
                        key={widget.id}
                        className="space-y-2 border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-800"
                      >
                        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {widget.title}
                        </p>
                        <ChartEmbedShareActions chartId={chartId} mode="public" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}

            <Card className={cn(SHARE_SECTION_CARD_CLASS, "shrink-0")}>
              <CardHeader className={SHARE_SECTION_CARD_HEADER_CLASS}>
                <CardTitle className="text-theme-base">高级嵌入配置</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ShareSectionActionRow
                  description={
                    <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                      配置来源白名单并生成带校验的 iframe 链接。
                    </p>
                  }
                  actions={
                    <Button asChild variant="outline" size="sm">
                      <Link to="/embed/share">打开嵌入分享</Link>
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
