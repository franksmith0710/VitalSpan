import { SchemaBrowser } from "@/components/datasources/SchemaBrowser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FolderTree, Server, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatasourceTestStatus, type TestConnectionResult } from "./DatasourceTestStatus";

type DatasourceDetailPanelProps = {
  dataSourceId: string;
  host: string;
  port: number;
  database: string;
  username: string;
  description?: string | null;
  testError: string | null;
  testResult: TestConnectionResult | null;
};

const STAT_ITEMS = [
  { key: "host", label: "主机地址", icon: Server },
  { key: "database", label: "数据库", icon: Database },
  { key: "username", label: "用户名", icon: User },
] as const;

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Server;
}) {
  return (
    <Card elevation={1}>
      <CardContent className="flex items-start gap-4 p-5 sm:p-6">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 font-mono text-theme-sm font-semibold break-all text-gray-800 dark:text-white/90">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DatasourceDetailPanel({
  dataSourceId,
  host,
  port,
  database,
  username,
  description,
  testError,
  testResult,
}: DatasourceDetailPanelProps) {
  const statValues = {
    host: `${host}:${port}`,
    database,
    username,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {STAT_ITEMS.map(({ key, label, icon }) => (
          <StatCard key={key} label={label} value={statValues[key]} icon={icon} />
        ))}
      </div>

      {description ? (
        <Card elevation={1}>
          <CardContent className="p-5 sm:p-6">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">描述</p>
            <p className="mt-2 text-theme-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <DatasourceTestStatus error={testError} result={testResult} layout="card" />

      <Card elevation={1} className="flex min-h-[560px] flex-col overflow-hidden">
        <CardHeader className="border-b border-gray-200 px-5 py-5 sm:px-6 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <FolderTree className="size-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-theme-base">元数据浏览</CardTitle>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                左侧选择 Schema 与表，右侧查看字段结构
              </p>
            </div>
          </div>
        </CardHeader>
        <SchemaBrowser
          dataSourceId={dataSourceId}
          embedded
          defaultDatabase={database}
          className="min-h-0 flex-1"
        />
      </Card>
    </div>
  );
}
