import { BarChart3, Database, Link2 } from "lucide-react";
import { Link } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type SyncJobConsumeGuideProps = {
  targetTable: string;
  className?: string;
};

export function SyncJobConsumeGuide({ targetTable, className }: SyncJobConsumeGuideProps) {
  return (
    <Alert variant="info" className={className}>
      <BarChart3 className="size-4" aria-hidden />
      <AlertTitle>同步后如何出图</AlertTitle>
      <AlertDescription className="space-y-2 text-theme-sm">
        <p>
          同步成功后，数据写入托管分析库
          <span className="font-mono text-theme-xs"> localhost:5433/analytics</span>
          中的表
          <span className="font-mono text-theme-xs"> {targetTable}</span>。
        </p>
        <ol className="list-decimal space-y-1 pl-4">
          <li className="flex items-start gap-1.5">
            <Database className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
            <span>
              在
              <Link to="/admin/datasources" className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400">
                数据连接 → 数据源
              </Link>
              登记该 PostgreSQL 分析库（若尚无「分析库」条目）。
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <Link2 className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
            <span>
              建图表或仪表板时选择该数据源，执行 SQL，例如：
              <code className="mt-1 block rounded bg-gray-100 px-2 py-1 font-mono text-theme-xs dark:bg-gray-800">
                SELECT * FROM &quot;{targetTable}&quot;
              </code>
            </span>
          </li>
        </ol>
      </AlertDescription>
    </Alert>
  );
}
