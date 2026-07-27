import { useState } from "react";
import { Link2, Upload } from "lucide-react";
import { Link } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LayoutWidget } from "./layoutUtils";
import type { VizComponentMap } from "@/lib/resolveVizComponent";
import { detachLinkedWidget } from "@/lib/resolveVizComponent";
import { isLinkedComponentRef } from "@/lib/vizComponents";
import { isPublishableWidgetType } from "@/lib/vizComponentEdit";

type VizComponentInspectorHeaderProps = {
  widget: LayoutWidget;
  resolvedWidget: LayoutWidget;
  componentMap: VizComponentMap;
  onDetach: (widget: LayoutWidget) => void;
  onRelink?: () => void;
  onPublish?: () => void;
  onPushToLibrary?: () => void;
  pushing?: boolean;
};

export function VizComponentInspectorHeader({
  widget,
  resolvedWidget,
  componentMap,
  onDetach,
  onRelink,
  onPublish,
  onPushToLibrary,
  pushing,
}: VizComponentInspectorHeaderProps) {
  const [detachOpen, setDetachOpen] = useState(false);
  const linked = isLinkedComponentRef(widget.componentRef);
  const detached = Boolean(widget.componentRef?.detached);
  const publishable = isPublishableWidgetType(widget.type);

  if (!publishable) return null;

  if (detached) {
    return (
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-500/25 bg-amber-500/5 px-3 py-2 dark:border-amber-400/20 dark:bg-amber-400/10"
        data-testid="viz-component-detached-banner"
      >
        <Badge variant="light" color="warning" className="gap-1">
          已断开链接
        </Badge>
        <span className="min-w-0 flex-1 text-theme-xs text-gray-600 dark:text-gray-400">
          当前为本地副本，修改不会同步到组件库
        </span>
        {onRelink ? (
          <Button type="button" size="sm" variant="outline" onClick={onRelink}>
            重新链接
          </Button>
        ) : null}
        {onPublish ? (
          <Button type="button" size="sm" onClick={onPublish}>
            发布为新组件
          </Button>
        ) : null}
      </div>
    );
  }

  if (linked) {
    const component = componentMap.get(widget.componentRef!.componentId);
    const label = component
      ? `${component.name} · v${component.contentRevision}`
      : "组件已下架或无权访问";

    return (
      <>
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-brand-500/20 bg-brand-500/5 px-3 py-2 dark:border-brand-400/20 dark:bg-brand-400/10"
          data-testid="viz-component-link-banner"
        >
          <Badge variant="light" color="primary" className="gap-1">
            <Link2 className="size-3" aria-hidden />
            已链接
          </Badge>
          <span className="min-w-0 flex-1 truncate text-theme-xs text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {component ? (
            <Button type="button" size="sm" variant="ghost" asChild>
              <Link to={`/admin/viz-components/${component.id}/edit`}>在库中编辑</Link>
            </Button>
          ) : null}
          {onPushToLibrary ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pushing || !component}
              onClick={onPushToLibrary}
            >
              {pushing ? "保存中…" : "更新到库"}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={() => setDetachOpen(true)}>
            断开链接
          </Button>
        </div>
        <AlertDialog open={detachOpen} onOpenChange={setDetachOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>断开组件库链接？</AlertDialogTitle>
              <AlertDialogDescription>
                将复制当前配置到本地，之后修改不再同步到组织组件库「{component?.name ?? "未知组件"}」。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDetach(detachLinkedWidget(widget, componentMap));
                  setDetachOpen(false);
                }}
              >
                断开并本地化
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (!onPublish) return null;

  return (
    <div className="flex shrink-0 justify-end border-b border-gray-100 px-2 py-1.5 dark:border-white/[0.06]">
      <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={onPublish}>
        <Upload className="size-3.5" aria-hidden />
        发布到组件库
      </Button>
    </div>
  );
}
