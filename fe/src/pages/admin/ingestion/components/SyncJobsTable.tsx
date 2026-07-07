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
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sourceTypeLabel, type SyncJobSummary } from "./sync-job-types";

type SyncJobsTableProps = {
  jobs: SyncJobSummary[];
  runningId: string | null;
  onRun: (job: SyncJobSummary) => void;
  onDelete: (job: SyncJobSummary) => void;
};

export function SyncJobsTable({ jobs, runningId, onRun, onDelete }: SyncJobsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[800px] w-full text-left text-theme-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">任务</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">源类型</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">目标表</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">调度</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">操作</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.02]"
            >
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
                  {sourceTypeLabel(job.source_type)}
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
                  {job.enabled ? "已启用" : "已停用"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-0.5">
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="手动运行同步"
                    disabled={runningId === job.id}
                    loading={runningId === job.id}
                    onClick={() => onRun(job)}
                  >
                    <Play className="size-4" />
                  </IconButton>
                  <IconButton asChild variant="ghost" size="sm" aria-label="查看运行历史">
                    <Link to={`/admin/ingestion/sync-jobs/${job.id}/history`}>
                      <History className="size-4" />
                    </Link>
                  </IconButton>
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
