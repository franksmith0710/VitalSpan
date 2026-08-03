import { Link } from "react-router";
import {
  CalendarClock,
  Hand,
  History,
  Pencil,
  Play,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { ListHeaderCheckbox, ListRowCheckbox, listTableSelectCellClass, listTableSelectHeadClass } from "@/components/layout/list-batch-delete";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { HintTooltip, TruncateHint } from "@/components/ui/hint-tooltip";
import { cn } from "@/lib/utils";
import { localizeApiMessage } from "@/lib/apiError";
import {
  lastRunBadgeColor,
  lastRunStatusLabel,
  sourceSummaryLabel,
  syncModeLabel,
  type SyncJobSummary,
} from "./sync-job-types";

type SyncJobsTableProps = {
  jobs: SyncJobSummary[];
  canManage: boolean;
  runningId: string | null;
  pollingJobId?: string | null;
  onRun: (job: SyncJobSummary) => void;
  onDelete: (job: SyncJobSummary) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
  someSelected?: boolean;
};

function LastRunCell({ job }: { job: SyncJobSummary }) {
  const lastRun = job.last_run;
  if (!lastRun) {
    return <span className="text-gray-400">暂无记录</span>;
  }
  return (
    <div className="space-y-1">
      <Badge color={lastRunBadgeColor(lastRun.status)} variant="light" size="sm">
        {lastRunStatusLabel(lastRun.status)}
      </Badge>
      <div className="text-theme-xs text-gray-500 dark:text-gray-400">
        {new Date(lastRun.started_at).toLocaleString("zh-CN")}
      </div>
      {lastRun.status === "succeeded" && lastRun.rows_synced != null ? (
        <div className="text-theme-xs text-gray-500">{lastRun.rows_synced} 行</div>
      ) : null}
      {lastRun.status === "succeeded" ? (
        <Link
          to={`/admin/ingestion/sync-jobs/${job.id}/history`}
          className="text-theme-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
        >
          查看出图步骤
        </Link>
      ) : null}
      {lastRun.status === "failed" && lastRun.error_message ? (
        <TruncateHint
          title={localizeApiMessage(lastRun.error_message)}
          className="max-w-[160px] text-theme-xs text-error-600 dark:text-error-400"
        >
          {localizeApiMessage(lastRun.error_message)}
        </TruncateHint>
      ) : null}
    </div>
  );
}

export function SyncJobsTable({
  jobs,
  canManage,
  runningId,
  pollingJobId = null,
  onRun,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected = false,
  someSelected = false,
}: SyncJobsTableProps) {
  const showSelection = Boolean(onToggleSelect) && canManage;
  return (
    <div className="overflow-x-only">
      <table className="min-w-[1024px] w-full text-left text-theme-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <tr>
            {showSelection ? (
              <th className={listTableSelectHeadClass}>
                <ListHeaderCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={jobs.length === 0}
                  onCheckedChange={() => onToggleSelectAll?.()}
                />
              </th>
            ) : null}
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">任务</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">源</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">同步方式</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">目标表</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">定时调度</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Cron 开关</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">最近运行</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">操作</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.02]"
            >
              {showSelection ? (
                <td className={listTableSelectCellClass}>
                  <ListRowCheckbox
                    checked={selectedIds?.has(job.id) ?? false}
                    onCheckedChange={() => onToggleSelect?.(job.id)}
                    ariaLabel={`选择任务 ${job.name}`}
                  />
                </td>
              ) : null}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    <RefreshCw className="size-4" aria-hidden />
                  </div>
                  <span className="font-medium text-gray-800 dark:text-white/90">{job.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="light" color="primary" size="sm">
                  {sourceSummaryLabel(job)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="light" color={job.sync_mode === "incremental" ? "warning" : "light"} size="sm">
                  {syncModeLabel(job.sync_mode)}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-300">
                {job.target_table}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  {job.schedule_cron ? (
                    <>
                      <CalendarClock className="size-4 shrink-0 text-gray-400" aria-hidden />
                      <span className="font-mono text-theme-xs">{job.schedule_cron}</span>
                    </>
                  ) : (
                    <>
                      <Hand className="size-4 shrink-0 text-gray-400" aria-hidden />
                      <span>手动</span>
                    </>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge color={job.enabled ? "success" : "light"} variant="light" size="sm">
                  {job.enabled ? "Cron 已启用" : "Cron 已停用"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <LastRunCell job={job} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-0.5">
                  {canManage ? (
                    <>
                      {(() => {
                        const runInProgress =
                          job.last_run?.status === "running" ||
                          runningId === job.id ||
                          pollingJobId === job.id;
                        const runTip = runInProgress
                          ? "同步进行中，完成后自动更新；当前不支持暂停或取消"
                          : "手动运行同步（全量将覆盖目标表）";
                        return (
                          <HintTooltip label={runTip}>
                            <IconButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="手动运行同步"
                              disabled={runInProgress}
                              loading={runInProgress}
                              onClick={() => onRun(job)}
                            >
                              <Play className="size-4" />
                            </IconButton>
                          </HintTooltip>
                        );
                      })()}
                      <IconButton asChild variant="ghost" size="sm" aria-label="配置清洗规则">
                        <Link to={`/admin/ingestion/sync-jobs/${job.id}/etl-rules`}>
                          <Settings2 className="size-4" />
                        </Link>
                      </IconButton>
                      <IconButton asChild variant="ghost" size="sm" aria-label="编辑任务">
                        <Link to={`/admin/ingestion/sync-jobs/${job.id}/edit`}>
                          <Pencil className="size-4" />
                        </Link>
                      </IconButton>
                      <IconButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-400",
                        )}
                        aria-label="删除任务"
                        onClick={() => onDelete(job)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </>
                  ) : null}
                  <IconButton asChild variant="ghost" size="sm" aria-label="查看运行历史">
                    <Link to={`/admin/ingestion/sync-jobs/${job.id}/history`}>
                      <History className="size-4" />
                    </Link>
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
