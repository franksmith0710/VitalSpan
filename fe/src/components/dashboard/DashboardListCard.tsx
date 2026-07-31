import { Link } from "react-router";
import { Eye, LayoutDashboard, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import {
  HUB_CARD_BODY_CLASS,
  HUB_CARD_PREVIEW_FRAME_CLASS,
  HUB_CARD_SHELL_CLASS,
  HUB_CARD_SKELETON_BODY_CLASS,
  HUB_CARD_SKELETON_PREVIEW_CLASS,
  hubCardPreviewFrameStyle,
} from "@/components/dashboard/hubCardUi";
import { DashboardListCardPreview } from "@/components/dashboard/DashboardListCardPreview";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ListRowCheckbox } from "@/components/layout/list-batch-delete";
import {
  dataScreenEditPath,
  dataScreenPreviewPath,
  dashboardSharePath,
  isDataScreenLayout,
} from "@/lib/dataScreenLayout";
import { previewSummaryToLayout, type DashboardPreviewSummary } from "@/lib/dashboardListPreview";

export type DashboardListItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  /** 详情接口字段；列表接口使用 previewSummary */
  layoutJson?: DashboardLayout;
  previewSummary?: DashboardPreviewSummary;
  surfaceKind?: "dashboard" | "data-screen";
  widgetCount?: number;
  thumbnailUrl?: string | null;
  updatedAt: string;
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardListCard({
  dashboard,
  canEdit,
  onDelete,
  selected,
  onToggleSelect,
  className,
  routeBase = "/admin/dashboards",
}: {
  dashboard: DashboardListItem;
  canEdit: boolean;
  onDelete?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
  /** 列表入口：看板或数据大屏 */
  routeBase?: string;
}) {
  const layoutForPreview =
    dashboard.layoutJson ?? previewSummaryToLayout(dashboard.previewSummary);
  const widgetCount =
    dashboard.widgetCount ?? layoutForPreview?.widgets?.length ?? 0;
  const isScreen =
    dashboard.surfaceKind === "data-screen" || isDataScreenLayout(layoutForPreview);
  const viewPath = isScreen ? dataScreenPreviewPath(dashboard.id) : `${routeBase}/${dashboard.id}`;
  const editPath = isScreen ? dataScreenEditPath(dashboard.id) : `${routeBase}/${dashboard.id}/edit`;
  const sharePath = dashboardSharePath(dashboard.id, isScreen);
  const primaryPath = canEdit ? editPath : viewPath;

  return (
    <article className={cn(HUB_CARD_SHELL_CLASS, className)}>
      <div className={HUB_CARD_PREVIEW_FRAME_CLASS} style={hubCardPreviewFrameStyle()}>
        {onToggleSelect ? (
          <div className="absolute left-2 top-2 z-10 rounded-md bg-white/90 p-0.5 shadow-sm dark:bg-gray-900/90">
            <ListRowCheckbox
              checked={Boolean(selected)}
              onCheckedChange={() => onToggleSelect()}
              ariaLabel={`选择看板 ${dashboard.name}`}
            />
          </div>
        ) : null}
        <DashboardListCardPreview
          dashboardId={dashboard.id}
          layoutJson={layoutForPreview}
          className="h-full"
        />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-gray-900/30 opacity-0 backdrop-blur-[3px] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button asChild variant="primary" size="sm">
            <Link to={primaryPath}>{canEdit ? "编辑" : "查看"}</Link>
          </Button>
          {canEdit ? (
            <Button asChild variant="outline" size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link to={viewPath}>预览</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className={HUB_CARD_BODY_CLASS}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={primaryPath}
              className="block truncate text-theme-sm font-semibold text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
            >
              {dashboard.name}
            </Link>
            {dashboard.description ? (
              <TruncateHint
                title={dashboard.description}
                as="p"
                className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400"
              >
                {dashboard.description}
              </TruncateHint>
            ) : (
              <p className="mt-1 truncate text-theme-xs text-gray-400 dark:text-gray-500">
                {dashboard.slug}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                variant="ghost"
                size="sm"
                showTooltip={false}
                aria-label={`${dashboard.name} 更多操作`}
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link to={viewPath} className="gap-2">
                  <Eye className="size-4" />
                  查看
                </Link>
              </DropdownMenuItem>
              {canEdit ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={editPath} className="gap-2">
                      <Pencil className="size-4" />
                      编辑
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={sharePath} className="gap-2">
                      <Share2 className="size-4" />
                      分享
                    </Link>
                  </DropdownMenuItem>
                  {onDelete ? (
                    <DropdownMenuItem variant="destructive" onClick={onDelete}>
                      <Trash2 className="size-4" aria-hidden />
                      删除
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="light" color="light" size="sm">
            {widgetCount} 个组件
          </Badge>
          <span className="text-theme-xs text-gray-400 dark:text-gray-500">
            更新于 {formatUpdatedAt(dashboard.updatedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function DashboardListCardSkeleton() {
  return (
    <div className={cn(HUB_CARD_SHELL_CLASS, "shadow-none")}>
      <div className={HUB_CARD_SKELETON_PREVIEW_CLASS} />
      <div className={HUB_CARD_SKELETON_BODY_CLASS}>
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-white/[0.06]" />
        <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-white/[0.04]" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-white/[0.04]" />
      </div>
    </div>
  );
}

export function DashboardListEmptyIcon() {
  return <LayoutDashboard className="size-7" aria-hidden />;
}
