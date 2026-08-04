import { BarChart3, Layers, LayoutDashboard, Play, X } from "lucide-react";
import { Link } from "react-router";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildDatasetCreatePath } from "@/lib/syncConsumePaths";

type SyncJobConsumeGuideProps = {
  jobId?: string;
  /** 任务显示名；有则标题会标明是哪条任务 */
  jobName?: string;
  targetTable: string;
  rowsSynced?: number | null;
  analyticsDatasourceId?: string | null;
  /** after_success：刚跑成功；how_to：编辑页出图指引 */
  variant?: "after_success" | "how_to";
  /** 刚从新建页跳转而来，强调先运行 */
  justCreated?: boolean;
  syncMode?: "full" | "incremental";
  onDismiss?: () => void;
  className?: string;
};

export function SyncJobConsumeGuide({
  jobId,
  jobName,
  targetTable,
  rowsSynced,
  analyticsDatasourceId,
  variant = "after_success",
  justCreated = false,
  syncMode = "full",
  onDismiss,
  className,
}: SyncJobConsumeGuideProps) {
  const datasetCreatePath = buildDatasetCreatePath({
    targetTable,
    suggestedDatasetId: targetTable,
    dataSourceId: analyticsDatasourceId ?? undefined,
  });
  const historyPath = jobId ? `/admin/ingestion/sync-jobs/${jobId}/history` : null;

  if (variant === "how_to") {
    return (
      <Alert variant="info" className={className}>
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <AlertTitle className="mb-0">
                {justCreated ? "任务已创建 · 下一步请运行同步" : "下一步：运行同步并出图"}
              </AlertTitle>
              {onDismiss ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  aria-label="关闭引导"
                  onClick={onDismiss}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
            <div className="space-y-3 text-theme-sm text-gray-500 dark:text-gray-400">
              {justCreated ? (
                <p className="text-theme-sm text-gray-700 dark:text-gray-300">
                  配置已保存。须先在列表<strong className="font-semibold">手动运行</strong>
                  一次同步，数据才会写入托管分析库；运行成功后再绑定 Dataset 出图。
                </p>
              ) : null}
              <p>
                目标表
                <span className="font-mono text-theme-xs"> {targetTable}</span>
                对应 Dataset ID
                <span className="font-mono text-theme-xs"> {targetTable}</span>
                ，写入托管分析库
                <span className="font-mono text-theme-xs"> 5433/analytics</span>
                。<strong className="font-semibold text-gray-700 dark:text-gray-300">
                  须先运行同步
                </strong>
                才有表与数据；绑定 Dataset 请在运行成功之后进行。
              </p>
              <ol className="list-decimal space-y-2 pl-4">
                <li className="flex items-start gap-1.5">
                  <Play className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
                  <span>
                    在
                    <Link
                      to="/admin/ingestion/sync-jobs"
                      className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      同步任务列表
                    </Link>
                    找到
                    {jobName ? (
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        「{jobName}」
                      </span>
                    ) : (
                      "本任务"
                    )}
                    ，点击 ▶ <strong className="font-semibold">手动运行</strong>
                    {runModeHint(syncMode)}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Layers className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
                  <span>
                    运行成功后，列表或
                    {historyPath ? (
                      <Link
                        to={historyPath}
                        className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                      >
                        运行历史
                      </Link>
                    ) : (
                      "运行历史"
                    )}
                    页会出现动作卡，点击
                    <strong className="font-semibold">一键创建 Dataset 并绑定</strong>
                    （系统会自动登记分析库，通常无需手填 5433）。
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <LayoutDashboard className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
                  <span>
                    点击
                    <strong className="font-semibold">创建看板</strong>
                    ，在图表配置中选择该 Dataset 并拖字段出图。
                  </span>
                </li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="primary" size="sm">
                  <Link to="/admin/ingestion/sync-jobs">去列表运行同步</Link>
                </Button>
                {historyPath ? (
                  <Button asChild variant="outline" size="sm">
                    <Link to={historyPath}>运行历史 / 一键出图</Link>
                  </Button>
                ) : null}
              </div>
              <details className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.02]">
                <summary className="cursor-pointer text-theme-xs font-medium text-gray-600 dark:text-gray-400">
                  高级：手动登记分析库并创建 Dataset
                </summary>
                <ol className="mt-2 list-decimal space-y-2 pl-4 text-theme-xs">
                  <li>
                    在
                    <Link
                      to="/admin/datasources/new"
                      className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      连接管理
                    </Link>
                    登记 PostgreSQL（
                    <span className="font-mono">127.0.0.1:5433/analytics</span>）。
                  </li>
                  <li>
                    <Link
                      to={datasetCreatePath}
                      className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      手动新建 Dataset
                    </Link>
                    并勾选表
                    <span className="font-mono"> {targetTable}</span>（须在同步成功后）。
                  </li>
                </ol>
              </details>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  const title = jobName
    ? `任务「${jobName}」同步成功 · 下一步出图`
    : "同步成功 · 下一步出图";

  return (
    <Alert variant="info" className={className}>
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <AlertTitle className="mb-0">{title}</AlertTitle>
            {onDismiss ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                aria-label="关闭引导"
                onClick={onDismiss}
              >
                <X className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
          <div className="space-y-3 text-theme-sm text-gray-500 dark:text-gray-400">
            <p>
              任务
              {jobName ? (
                <>
                  <span className="font-medium text-gray-700 dark:text-gray-300">「{jobName}」</span>
                  已将数据写入
                </>
              ) : (
                "已将数据写入"
              )}
              托管分析库
              <span className="font-mono text-theme-xs"> localhost:5433/analytics</span>
              的表
              <span className="font-mono text-theme-xs"> {targetTable}</span>
              {rowsSynced != null ? `（本次 ${rowsSynced} 行）` : ""}。点击
              <strong className="font-semibold">一键创建 Dataset 并绑定</strong>即可出图。
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="primary" size="sm">
                <Link to={datasetCreatePath}>创建数据集</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/dashboards">打开仪表板</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Alert>
  );
}

function runModeHint(syncMode: "full" | "incremental"): string {
  return syncMode === "incremental"
    ? "（增量任务 upsert，不清空目标表）"
    : "（全量任务会覆盖目标表已有数据）";
}
