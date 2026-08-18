import { Camera, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, ListPageFooter, ListPageTableFrame } from "@/components/layout/list-page-kit";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { cn } from "@/lib/utils";
import type { AnalysisPack, AnalysisTheme, CompareResult } from "../useStandardAnalysis";
import {
  compareDeltaClassName,
  formatCompareDelta,
  THEME_META,
} from "./standardAnalysisUi";
import {
  formatCompareDeltaPct,
  hasPreviousSnapshot,
  latestSnapshotForTheme,
  SNAPSHOT_SCHEDULE_HINT,
  snapshotPresetLabel,
  themeAggregationHint,
} from "./standardAnalysisCompareUi";

type Props = {
  pack: AnalysisPack;
  activeTheme: AnalysisTheme;
  compareData?: CompareResult;
  snapshots?: Array<{ theme: AnalysisTheme; periodKey: string; capturedAt: string }>;
  isLoading: boolean;
  canManage: boolean;
  capturePending: boolean;
  onCapture: () => void;
};

function CompareSemanticsBanner({ pack, activeTheme, compareData, latestSnapshot }: {
  pack: AnalysisPack;
  activeTheme: AnalysisTheme;
  compareData: CompareResult;
  latestSnapshot?: { periodKey: string; capturedAt: string };
}) {
  const themeLabel = THEME_META[activeTheme]?.label ?? activeTheme;
  const scheduleHint = SNAPSHOT_SCHEDULE_HINT[pack.snapshotCronPreset];
  const snapshotLabel = snapshotPresetLabel(pack.snapshotCronPreset);

  return (
    <div className="mb-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <p className="text-theme-xs font-medium text-gray-800 dark:text-white/90">
        {themeLabel} · {themeAggregationHint(pack, activeTheme)}
      </p>
      <ul className="space-y-1 text-theme-xs text-gray-600 dark:text-gray-400">
        <li>
          <span className="font-medium text-gray-700 dark:text-gray-300">本期</span>
          ：当前实时查询（周期键 {compareData.currentPeriodKey}）
        </li>
        <li>
          <span className="font-medium text-gray-700 dark:text-gray-300">上期</span>
          ：上一周期自动快照
          {compareData.previousPeriodKey ? `（${compareData.previousPeriodKey}）` : "（尚未生成）"}
        </li>
        <li>
          <span className="font-medium text-gray-700 dark:text-gray-300">快照节奏</span>
          ：{snapshotLabel}，{scheduleHint}；仅供平台内对比，与邮件投递无关
        </li>
        {latestSnapshot ? (
          <li>
            <span className="font-medium text-gray-700 dark:text-gray-300">最近快照</span>
            ：{latestSnapshot.periodKey}（{new Date(latestSnapshot.capturedAt).toLocaleString()}）
          </li>
        ) : (
          <li>
            <span className="font-medium text-gray-700 dark:text-gray-300">最近快照</span>
            ：暂无
          </li>
        )}
      </ul>
    </div>
  );
}

function NoPreviousSnapshotState({
  pack,
  canManage,
  capturePending,
  onCapture,
}: {
  pack: AnalysisPack;
  canManage: boolean;
  capturePending: boolean;
  onCapture: () => void;
}) {
  const scheduleHint = SNAPSHOT_SCHEDULE_HINT[pack.snapshotCronPreset];

  return (
    <PanelEmptyState
      icon={<Timer className="size-6" aria-hidden />}
      title="暂无上期快照，无法对比"
      description={`对比需要「上一统计周期」的快照。当前分析包已配置${snapshotPresetLabel(pack.snapshotCronPreset)}（${scheduleHint}）。保存本期快照后，下一周期开始即可查看增减。`}
      action={
        canManage ? (
          <Button type="button" size="sm" disabled={capturePending} onClick={onCapture}>
            <Camera className="size-4" aria-hidden />
            {capturePending ? "保存中…" : "保存本期快照"}
          </Button>
        ) : undefined
      }
      size="md"
      variant="framed"
    />
  );
}

export function StandardAnalysisCompareView({
  pack,
  activeTheme,
  compareData,
  snapshots,
  isLoading,
  canManage,
  capturePending,
  onCapture,
}: Props) {
  const ready = compareData && hasPreviousSnapshot(compareData);
  const latestSnapshot = latestSnapshotForTheme(snapshots, activeTheme);

  return (
    <ListPageTableFrame className="flex min-h-0 flex-1 flex-col">
      {compareData && !isLoading ? (
        <div className="px-5 pt-4">
          <CompareSemanticsBanner
            pack={pack}
            activeTheme={activeTheme}
            compareData={compareData}
            latestSnapshot={latestSnapshot}
          />
        </div>
      ) : null}

      {!isLoading && compareData && !hasPreviousSnapshot(compareData) ? (
        <div className="flex flex-1 items-center justify-center px-5 pb-6">
          <NoPreviousSnapshotState
            pack={pack}
            canManage={canManage}
            capturePending={capturePending}
            onCapture={onCapture}
          />
        </div>
      ) : (
        <DataTable
          loading={isLoading}
          empty={!isLoading && ready && (compareData?.deltas.length ?? 0) === 0}
          headers={["维度", "本期", "上期", "增减"]}
          lastColumnAlign="right"
          rows={(compareData?.deltas ?? []).map((delta) => [
            <span key={`${delta.key}-dim`} className="font-medium text-gray-800 dark:text-white/90">
              {delta.key}
            </span>,
            <span key={`${delta.key}-current`} className="tabular-nums">
              {delta.currentValue}
            </span>,
            <span key={`${delta.key}-previous`} className="tabular-nums text-gray-500 dark:text-gray-400">
              {delta.previousValue ?? "—"}
            </span>,
            <span
              key={`${delta.key}-delta`}
              className={cn("tabular-nums font-medium", compareDeltaClassName(delta.delta))}
            >
              {formatCompareDelta(delta.delta)}
              {formatCompareDeltaPct(delta.deltaPct) ? (
                <span className="ml-1 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                  ({formatCompareDeltaPct(delta.deltaPct)})
                </span>
              ) : null}
            </span>,
          ])}
          emptyState={{
            icon: null,
            title: "暂无可对比数据",
            description: "当前主题未返回可对比的维度结果。",
          }}
        />
      )}

      {compareData && !isLoading ? (
        <ListPageFooter>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            本期 {compareData.currentPeriodKey}
            {compareData.previousPeriodKey ? ` · 上期 ${compareData.previousPeriodKey}` : " · 暂无上期快照"}
          </p>
        </ListPageFooter>
      ) : null}
    </ListPageTableFrame>
  );
}
