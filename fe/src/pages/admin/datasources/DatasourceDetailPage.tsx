import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { SchemaBrowser } from "@/components/datasources/SchemaBrowser";

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

type TestConnectionOut = {
  ok: boolean;
  message: string;
  latencyMs?: number | null;
  code?: string | null;
  traceId?: string | null;
};

export function DatasourceDetailPage() {
  const { id = "" } = useParams();
  const [testResult, setTestResult] = useState<TestConnectionOut | null>(null);
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
      apiFetch<TestConnectionOut>(`/api/v1/datasources/${id}/test`, { method: "POST" }),
    onSuccess: (result) => {
      setTestResult(result);
      setTestError(null);
    },
    onError: (err) => {
      setTestResult(null);
      setTestError(mapApiError(err));
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-48 w-full max-w-3xl" />
      </div>
    );
  }

  if (isError) {
    const message = mapApiError(error);
    const notFound = message.includes("不存在");
    return (
      <AdminPageShell title="数据源详情">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-theme-sm text-gray-600 dark:text-gray-400">
            {notFound ? "数据源不存在" : message}
          </p>
          {!notFound ? (
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              重试
            </Button>
          ) : (
            <Button asChild className="mt-4" variant="outline">
              <Link to="/admin/datasources">返回列表</Link>
            </Button>
          )}
        </div>
      </AdminPageShell>
    );
  }

  if (!data) return null;

  return (
    <AdminPageShell
      title={data.name}
      description={`标识 ${data.code} · 类型 ${data.type}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? "测试中…" : "测试连接"}
          </Button>
          <Button asChild variant="outline">
            <Link to={`/admin/datasources/${id}/edit`}>编辑</Link>
          </Button>
        </div>
      }
    >
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>连接信息</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">主机</dt>
              <dd className="mt-1 text-theme-sm font-medium">
                {data.host}:{data.port}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">数据库</dt>
              <dd className="mt-1 text-theme-sm font-medium">{data.database}</dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">用户名</dt>
              <dd className="mt-1 text-theme-sm font-medium">{data.username}</dd>
            </div>
            {data.description ? (
              <div className="sm:col-span-2">
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">描述</dt>
                <dd className="mt-1 text-theme-sm">{data.description}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6">
        <SchemaBrowser dataSourceId={id} />
      </div>

      {testError ? (
        <div className="max-w-3xl rounded-xl border border-error-500 bg-error-50 p-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {testError}
        </div>
      ) : null}

      {testResult ? (
        <div
          className={
            testResult.ok
              ? "max-w-3xl rounded-xl border border-success-500 bg-success-50 p-4 text-theme-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
              : "max-w-3xl rounded-xl border border-error-500 bg-error-50 p-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
          }
        >
          <p>{testResult.message}</p>
          {testResult.ok && testResult.latencyMs != null ? (
            <p className="mt-1">延迟 {testResult.latencyMs} ms</p>
          ) : null}
          {!testResult.ok && testResult.code ? (
            <p className="mt-1 text-theme-xs opacity-80">错误码：{testResult.code}</p>
          ) : null}
          {testResult.traceId ? (
            <details className="mt-2 text-theme-xs">
              <summary className="cursor-pointer">技术详情</summary>
              <p className="mt-1 break-all">traceId: {testResult.traceId}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </AdminPageShell>
  );
}
