import { SchemaBrowser } from "@/components/datasources/SchemaBrowser";
import { ADMIN_PAGE_SURFACE_CLASS, ListPageSection } from "@/components/layout/list-page-kit";
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
  { key: "host", label: "主机地址" },
  { key: "database", label: "数据库" },
  { key: "username", label: "用户名" },
] as const;

function ConnectionSummary({
  host,
  port,
  database,
  username,
  description,
  testError,
  testResult,
}: Omit<DatasourceDetailPanelProps, "dataSourceId">) {
  const statValues = {
    host: `${host}:${port}`,
    database,
    username,
  };

  return (
    <div className={cn(ADMIN_PAGE_SURFACE_CLASS, "shrink-0 overflow-hidden")}>
      <div className="grid sm:grid-cols-3 sm:divide-x sm:divide-gray-100 dark:sm:divide-gray-800">
        {STAT_ITEMS.map(({ key, label }) => (
          <div key={key} className="px-4 py-3">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-0.5 font-mono text-theme-sm font-semibold break-all text-gray-800 dark:text-white/90">
              {statValues[key]}
            </p>
          </div>
        ))}
      </div>
      {description ? (
        <div className="border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">描述</p>
          <p className="mt-0.5 text-theme-sm leading-snug text-gray-700 dark:text-gray-300">
            {description}
          </p>
        </div>
      ) : null}
      {testError || testResult ? (
        <DatasourceTestStatus error={testError} result={testResult} layout="inline" />
      ) : null}
    </div>
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
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <ConnectionSummary
        host={host}
        port={port}
        database={database}
        username={username}
        description={description}
        testError={testError}
        testResult={testResult}
      />
      <ListPageSection className="min-h-0 flex-1">
        <SchemaBrowser
          dataSourceId={dataSourceId}
          embedded
          defaultDatabase={database}
          className="min-h-0 flex-1"
        />
      </ListPageSection>
    </div>
  );
}
