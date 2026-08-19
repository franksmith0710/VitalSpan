import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisPack, AnalysisTheme, SnapshotRecord } from "../useStandardAnalysis";
import {
  latestSnapshotForTheme,
  SNAPSHOT_SCHEDULE_HINT,
  snapshotPresetLabel,
} from "./standardAnalysisCompareUi";

type Props = {
  pack: AnalysisPack;
  activeTheme: AnalysisTheme;
  snapshots?: SnapshotRecord[];
  canManage: boolean;
  capturePending: boolean;
  onCapture: () => void;
};

export function StandardAnalysisSnapshotStrip({
  pack,
  activeTheme,
  snapshots,
  canManage,
  capturePending,
  onCapture,
}: Props) {
  const latest = latestSnapshotForTheme(snapshots, activeTheme);
  const scheduleHint = SNAPSHOT_SCHEDULE_HINT[pack.snapshotCronPreset];
  const snapshotLabel = snapshotPresetLabel(pack.snapshotCronPreset);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-2.5 text-theme-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
      <div className="min-w-0 space-y-0.5">
        <p>
          <span className="font-medium text-gray-700 dark:text-gray-300">快照节奏</span>
          ：{snapshotLabel}，{scheduleHint}
        </p>
        <p>
          <span className="font-medium text-gray-700 dark:text-gray-300">最近快照</span>
          {latest
            ? `：${latest.periodKey}（${new Date(latest.capturedAt).toLocaleString()}）`
            : "：暂无（保存后可与下一周期对比）"}
        </p>
      </div>
      {canManage ? (
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
