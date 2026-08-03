import { BarChart3, Database, Layers, LayoutDashboard, X } from "lucide-react";
import { Link } from "react-router";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildDatasetCreatePath } from "@/lib/syncConsumePaths";

type SyncJobConsumeGuideProps = {
  /** 任务显示名；有则标题会标明是哪条任务 */
  jobName?: string;
  targetTable: string;
  rowsSynced?: number | null;
  analyticsDatasourceId?: string | null;
  /** after_success：刚跑成功；how_to：编辑页参考说明（不宣称已成功） */
  variant?: "after_success" | "how_to";
  onDismiss?: () => void;
  className?: string;
};

export function SyncJobConsumeGuide({
  jobName,
  targetTable,
  rowsSynced,
  analyticsDatasourceId,
  variant = "after_success",
  onDismiss,
  className,
}: SyncJobConsumeGuideProps) {
  const datasetCreatePath = buildDatasetCreatePath({
    targetTable,
    suggestedDatasetId: targetTable,
    dataSourceId: analyticsDatasourceId ?? undefined,
  });

  const title =
    variant === "how_to"
      ? "同步完成后 · 如何在 BI 中使用数据"
      : jobName
        ? `任务「${jobName}」同步成功 · 下一步出图`
        : "同步成功 · 下一步出图";

  const intro =
    variant === "how_to" ? (
      <p>
        目标表为
        <span className="font-mono text-theme-xs"> {targetTable}</span>
        ，写入托管分析库
        <span className="font-mono text-theme-xs"> localhost:5433/analytics</span>
        。按下面三步在 Dataset / 看板中消费（无需在看板里写 SQL）。
      </p>
    ) : (
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
        {rowsSynced != null ? `（本次 ${rowsSynced} 行）` : ""}。按下面三步即可出图。
      </p>
    );

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
        {intro}
        <ol className="list-decimal space-y-2 pl-4">
          <li className="flex items-start gap-1.5">
            <Database className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
            <span>
              在
              <Link
                to="/admin/datasources/new"
                className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
              >
                数据连接 → 连接管理 → 新建
              </Link>
              登记 PostgreSQL 分析库（主机
              <span className="font-mono text-theme-xs"> 127.0.0.1</span>，端口
              <span className="font-mono text-theme-xs"> 5433</span>，库
              <span className="font-mono text-theme-xs"> analytics</span>）。
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <Layers className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
            <span>
              <Link
                to={datasetCreatePath}
                className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
              >
                创建 Dataset
              </Link>
              ，选择分析库并勾选表
              <span className="font-mono text-theme-xs"> {targetTable}</span>，保存后绑定查询配置。
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <LayoutDashboard className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
            <span>
              创建
              <Link
                to="/admin/dashboards"
                className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
              >
                空白仪表板
              </Link>
              ，在图表配置中选择该 Dataset 并拖字段出图。
            </span>
          </li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/datasources/new">登记分析库</Link>
          </Button>
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
