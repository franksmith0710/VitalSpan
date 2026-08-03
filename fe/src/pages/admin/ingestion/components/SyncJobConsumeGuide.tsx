import { BarChart3, Database, Layers, LayoutDashboard } from "lucide-react";
import { Link } from "react-router";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildDatasetCreatePath } from "@/lib/syncConsumePaths";

type SyncJobConsumeGuideProps = {
  targetTable: string;
  rowsSynced?: number | null;
  analyticsDatasourceId?: string | null;
  className?: string;
};

export function SyncJobConsumeGuide({
  targetTable,
  rowsSynced,
  analyticsDatasourceId,
  className,
}: SyncJobConsumeGuideProps) {
  const datasetCreatePath = buildDatasetCreatePath({
    targetTable,
    suggestedDatasetId: targetTable,
    dataSourceId: analyticsDatasourceId ?? undefined,
  });

  return (
    <Alert variant="info" className={className}>
      <BarChart3 className="size-4" aria-hidden />
      <AlertTitle>同步成功 · 下一步：在 BI 中使用数据</AlertTitle>
      <div className="space-y-3 text-theme-sm text-gray-500 dark:text-gray-400">
        <p>
          数据已写入托管分析库
          <span className="font-mono text-theme-xs"> localhost:5433/analytics</span>
          的表
          <span className="font-mono text-theme-xs"> {targetTable}</span>
          {rowsSynced != null ? `（本次 ${rowsSynced} 行）` : ""}。按下面三步即可出图（无需在看板里写 SQL）。
        </p>
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
              登记 PostgreSQL 分析库（类型 PostgreSQL；主机
              <span className="font-mono text-theme-xs"> 127.0.0.1</span>，端口
              <span className="font-mono text-theme-xs"> 5433</span>，库
              <span className="font-mono text-theme-xs"> analytics</span>，用户/密码
              <span className="font-mono text-theme-xs"> vitalspan</span>）。开发环境可启用
              <span className="font-mono text-theme-xs"> ENSURE_ANALYTICS_DATASOURCE=1</span>{" "}
              自动登记。
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
              ，选择刚登记的分析库并勾选表
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
    </Alert>
  );
}

export function pickLatestSucceededJob<
  T extends { last_run?: { status: string; finished_at?: string | null } | null },
>(jobs: T[]): T | undefined {
  return jobs
    .filter((job) => job.last_run?.status === "succeeded")
    .sort((a, b) =>
      (b.last_run?.finished_at ?? "").localeCompare(a.last_run?.finished_at ?? ""),
    )[0];
}
