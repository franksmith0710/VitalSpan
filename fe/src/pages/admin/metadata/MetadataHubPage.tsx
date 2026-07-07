import { type ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15">
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function DataTable({
  loading,
  empty,
  headers,
  rows,
}: {
  loading: boolean;
  empty: boolean;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <table className="min-w-[640px] w-full text-left text-theme-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={headers.length} className="px-4 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            : null}
          {empty && !loading ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                暂无数据
              </td>
            </tr>
          ) : null}
          {!loading
            ? rows.map((cells, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  {cells.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-gray-800 dark:text-white/90">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
}

export function MetadataHubPage() {
  const [tab, setTab] = useState("glossary");
  const [prefix, setPrefix] = useState("");

  const glossaryQuery = useQuery({
    queryKey: queryKeys.metadataHub.glossary({ codePrefix: prefix || undefined }),
    queryFn: () => {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      if (prefix.trim()) q.set("code_prefix", prefix.trim());
      return apiFetch<{
        items: Array<{ id: string; code: string; name: string; status: string }>;
        total: number;
      }>(`/api/v1/metadata/glossary?${q}`);
    },
    enabled: tab === "glossary",
  });

  const themesQuery = useQuery({
    queryKey: queryKeys.metadataHub.themes(null),
    queryFn: () =>
      apiFetch<{
        items: Array<{ id: string; name: string; code: string | null; parentId: string | null }>;
        total: number;
      }>("/api/v1/metadata/themes?limit=100&offset=0"),
    enabled: tab === "themes",
  });

  const dimensionsQuery = useQuery({
    queryKey: queryKeys.metadataHub.dimensions({ codePrefix: prefix || undefined }),
    queryFn: () => {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      if (prefix.trim()) q.set("code_prefix", prefix.trim());
      return apiFetch<{
        items: Array<{ id: string; code: string; name: string; status: string }>;
        total: number;
      }>(`/api/v1/metadata/dimensions?${q}`);
    },
    enabled: tab === "dimensions",
  });

  const activeError =
    tab === "glossary"
      ? glossaryQuery.error
      : tab === "themes"
        ? themesQuery.error
        : dimensionsQuery.error;

  return (
    <AdminPageShell
      title="语义层元数据"
      description="术语字典、业务主题树与维度字典（META-001~003）。"
    >
      {activeError ? (
        <ErrorBanner
          message={mapApiError(activeError)}
          onRetry={() => {
            if (tab === "glossary") void glossaryQuery.refetch();
            if (tab === "themes") void themesQuery.refetch();
            if (tab === "dimensions") void dimensionsQuery.refetch();
          }}
        />
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="glossary">术语字典</TabsTrigger>
          <TabsTrigger value="themes">业务主题</TabsTrigger>
          <TabsTrigger value="dimensions">维度字典</TabsTrigger>
        </TabsList>

        <TabsContent value="glossary" className="mt-6 space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="glossary-prefix">编码前缀</Label>
            <Input id="glossary-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <DataTable
            loading={glossaryQuery.isLoading}
            empty={(glossaryQuery.data?.items.length ?? 0) === 0}
            headers={["名称", "编码", "状态"]}
            rows={(glossaryQuery.data?.items ?? []).map((t) => [
              t.name,
              <span key="c" className="font-mono text-theme-xs">
                {t.code}
              </span>,
              <Badge key="s" variant="light" color="primary" size="sm">
                {t.status}
              </Badge>,
            ])}
          />
        </TabsContent>

        <TabsContent value="themes" className="mt-6">
          <DataTable
            loading={themesQuery.isLoading}
            empty={(themesQuery.data?.items.length ?? 0) === 0}
            headers={["名称", "编码", "父节点"]}
            rows={(themesQuery.data?.items ?? []).map((t) => [
              t.name,
              t.code ?? "—",
              t.parentId ? t.parentId.slice(0, 8) + "…" : "根",
            ])}
          />
        </TabsContent>

        <TabsContent value="dimensions" className="mt-6 space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="dim-prefix">编码前缀</Label>
            <Input id="dim-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <DataTable
            loading={dimensionsQuery.isLoading}
            empty={(dimensionsQuery.data?.items.length ?? 0) === 0}
            headers={["名称", "编码", "状态"]}
            rows={(dimensionsQuery.data?.items ?? []).map((d) => [
              d.name,
              <span key="c" className="font-mono text-theme-xs">
                {d.code}
              </span>,
              <Badge key="s" variant="light" color="primary" size="sm">
                {d.status}
              </Badge>,
            ])}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
