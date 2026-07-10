import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Database, Pencil, PlugZap } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import {
  ConnectionStatusBadge,
  deriveConnectionStatus,
} from "./components/ConnectionStatusBadge";
import { DatasourceDetailPanel } from "./components/DatasourceDetailPanel";
import { type TestConnectionResult } from "./components/DatasourceTestStatus";
import { sourceTypeLabel } from "./components/datasource-labels";

type DataSourceOut = {
  id: string;
  name: string;
  code: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  description?: string | null;
};

function DetailSkeleton() {
  return (
    <AdminPageShell title="数据源详情">
      <Skeleton className="h-[520px] w-full rounded-xl" />
    </AdminPageShell>
  );
}

export function DatasourceDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.datasources.detail(id),
    queryFn: () => apiFetch<DataSourceOut>(`/api/v1/datasources/${id}`),
    enabled: Boolean(id),
    retry: (count, err) => {
      if (err instanceof Error && err.message.includes("不存在")) return false;
      return count < 1;
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      apiFetch<TestConnectionResult>(`/api/v1/datasources/${id}/test`, { method: "POST" }),
    onSuccess: (result) => {
      setTestResult(result);
      setTestError(null);
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["datasources", id] });
      }
    },
    onError: (err) => {
      setTestResult(null);
      setTestError(mapApiError(err));
    },
  });

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    const message = mapApiError(error);
    const notFound = message.includes("不存在");
    return (
      <AdminPageShell title="数据源详情">
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <Database className="size-6" aria-hidden />
          </div>
          <p className="text-theme-sm text-gray-600 dark:text-gray-400">
            {notFound ? "数据源不存在" : message}
          </p>
          <div className="mt-6">
            {notFound ? (
              <Button asChild variant="outline">
                <Link to="/admin/datasources">
                  <ArrowLeft className="size-4" aria-hidden />
                  返回列表
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void refetch()}>
                重试
              </Button>
            )}
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (!data) return null;

  const connectionStatus = deriveConnectionStatus(
    testMutation.isPending,
    testError,
    testResult,
  );

  return (
    <AdminPageShell
      title={data.name}
      description={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="light" color="primary" size="sm">
            {sourceTypeLabel(data.type)}
          </Badge>
          <span className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
            {data.code}
          </span>
          <ConnectionStatusBadge status={connectionStatus} />
        </div>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/datasources">
              <ArrowLeft className="size-4" aria-hidden />
              返回列表
            </Link>
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            <PlugZap aria-hidden />
            {testMutation.isPending ? "测试中…" : "测试连接"}
          </Button>
          <IconButton asChild variant="ghost" size="sm" aria-label="编辑">
            <Link to={`/admin/datasources/${id}/edit`}>
              <Pencil className="size-4" />
            </Link>
          </IconButton>
        </div>
      }
    >
      <DatasourceDetailPanel
        dataSourceId={id}
        host={data.host}
        port={data.port}
        database={data.database}
        username={data.username}
        description={data.description}
        testError={testError}
        testResult={testResult}
      />
    </AdminPageShell>
  );
}
