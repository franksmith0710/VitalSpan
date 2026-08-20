import { Camera } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import type { AnalysisPack, AnalysisTheme, SnapshotRecord } from "../useStandardAnalysis";
import { useReportSchedulesList } from "../useReportSchedules";
import { standardScheduleHubPath } from "../standardRoutes";
import {
  retentionPeriodsLabel,
  summarizePackDelivery,
} from "../standardAnalysisDeliverySummary";
import {
  latestSnapshotForTheme,
  SNAPSHOT_SCHEDULE_HINT,
  snapshotPresetLabel,
  themeAggregationHint,
} from "./standardAnalysisCompareUi";
import { THEME_META } from "./standardAnalysisUi";

type Props = {
  pack: AnalysisPack;
  activeTheme: AnalysisTheme;
  snapshots?: SnapshotRecord[];
  viewMode: "live" | "compare";
  canManage: boolean;
  capturePending: boolean;
  onCapture?: () => void;
};

export function StandardAnalysisSnapshotStrip({
  pack,
  activeTheme,
  snapshots,
  viewMode,
  canManage,
  capturePending,
  onCapture,
}: Props) {
  const latest = latestSnapshotForTheme(snapshots, activeTheme);
  const scheduleHint = SNAPSHOT_SCHEDULE_HINT[pack.snapshotCronPreset];
  const snapshotLabel = snapshotPresetLabel(pack.snapshotCronPreset);
  const themeLabel = THEME_META[activeTheme]?.label ?? activeTheme;
  const calibrationHint = themeAggregationHint(pack, activeTheme);
  const retentionLabel = retentionPeriodsLabel(pack.snapshotRetentionPeriods);

  const schedulesQuery = useReportSchedulesList({
    sourceType: "standard",
    sourceKey: pack.packKey,
  });
  const delivery = summarizePackDelivery(schedulesQuery.data?.items);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-2.5 text-theme-xs text-gray-600 dark:border-gray-800 dark:text-gray-400"
      data-testid="standard-analysis-observability-strip"
    >
      <div className="min-w-0 space-y-0.5">
        <p>
          <span className="font-medium text-gray-700 dark:text-gray-300">口径</span>
          ：{themeLabel} · {calibrationHint}
        </p>
        <p>
          <span className="font-medium text-gray-700 dark:text-gray-300">快照节奏</span>
          ：{snapshotLabel}，{scheduleHint}；{retentionLabel}
        </p>
        <p>
          <span className="font-medium text-gray-700 dark:text-gray-300">最近快照</span>
          {latest
            ? `：${latest.periodKey}（${new Date(latest.capturedAt).toLocaleString()}）`
            : "：暂无（保存后可与下一周期对比）"}
        </p>
        <p data-testid="standard-analysis-delivery-summary">
          <span className="font-medium text-gray-700 dark:text-gray-300">投递</span>
          ：{delivery.label.replace(/^定时投递：/, "")}
          {delivery.tone === "none" && canManage ? (
            <>
              {" "}
              <Link
                to={standardScheduleHubPath(pack.packKey)}
                className="text-brand-600 hover:underline dark:text-brand-400"
              >
                去配置
              </Link>
            </>
          ) : null}
        </p>
      </div>
      {canManage && viewMode === "live" && onCapture ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5"
          disabled={capturePending}
          onClick={onCapture}
        >
          <Camera className="size-3.5" aria-hidden />
          {capturePending ? "保存中…" : "保存本期快照"}
        </Button>
      ) : null}
    </div>
  );
}
