import { AlertCircle, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canRetryExecution, type ScheduleExecutionRow } from "../useReportSchedules";

type HistoryRowActionsProps = {
  row: ScheduleExecutionRow;
  compact?: boolean;
  readOnly?: boolean;
  downloading: boolean;
  downloadingSlot?: string | null;
  retrying: boolean;
  onDownload: (slot?: "full_page" | "per_widget") => void;
  onDetail: () => void;
  onRetry?: () => void;
};

export function HistoryRowActions({
  row,
  compact,
  readOnly,
  downloading,
  downloadingSlot,
  retrying,
  onDownload,
  onDetail,
  onRetry,
}: HistoryRowActionsProps) {
  const hasError = Boolean(row.errorMessage);
  const canDownload = row.artifactRef?.startsWith("storage://");
  const hasPerWidget = (row.secondaryArtifacts?.length ?? 0) > 0;
  const showRetry = !readOnly && canRetryExecution(row.status) && onRetry;
  const iconBtn = compact ? "size-8" : "h-8 px-2 text-theme-xs";

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {canDownload ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size={compact ? "icon" : "sm"}
            className={iconBtn}
            tooltip={compact ? (downloading && !downloadingSlot ? "下载中…" : "下载可视化报告") : undefined}
            disabled={downloading}
            onClick={() => onDownload("full_page")}
          >
            <Download className="size-3.5" aria-hidden />
            {compact ? (
              <span className="sr-only">下载</span>
            ) : downloading && downloadingSlot === "full_page" ? (
              "下载中…"
            ) : (
              "下载"
            )}
          </Button>
          {hasPerWidget ? (
            <Button
              type="button"
              variant="ghost"
              size={compact ? "icon" : "sm"}
              className={iconBtn}
              tooltip={compact ? (downloading ? "下载中…" : "下载按组件分页") : undefined}
              disabled={downloading}
              onClick={() => onDownload("per_widget")}
            >
              <Download className="size-3.5" aria-hidden />
              {compact ? (
                <span className="sr-only">按组件分页</span>
              ) : downloading && downloadingSlot === "per_widget" ? (
                "下载中…"
              ) : (
                "按组件分页"
              )}
            </Button>
          ) : null}
        </>
      ) : null}
      {hasError ? (
        <Button
          type="button"
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={iconBtn}
          tooltip={compact ? "查看错误详情" : undefined}
          onClick={onDetail}
        >
          {compact ? (
            <>
              <AlertCircle className="size-3.5" aria-hidden />
              <span className="sr-only">详情</span>
            </>
          ) : (
            "详情"
          )}
        </Button>
      ) : null}
      {showRetry ? (
        <Button
          type="button"
          variant="outline"
          size={compact ? "xs" : "sm"}
          className={compact ? "h-8 px-2.5" : "h-8"}
          disabled={retrying}
          onClick={onRetry}
        >
          {compact ? <RotateCcw className="size-3.5" aria-hidden /> : null}
          {retrying ? "重试中…" : "重试"}
        </Button>
      ) : null}
    </div>
  );
}
