import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type CatalogCategory = { code: string; name: string; description?: string | null; kind: string };
type CatalogEntry = {
  id: string;
  name: string;
  httpMethod: string;
  path: string;
  categoryCodes: string[];
  status: string;
  createdAt: string;
};

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

export function GovernanceCatalogPage() {
  const [category, setCategory] = useState<string>("__all__");

  const categoriesQuery = useQuery({
    queryKey: queryKeys.gov.categories,
    queryFn: () => apiFetch<{ items: CatalogCategory[] }>("/api/v1/gov/catalog/categories"),
  });

  const entriesQuery = useQuery({
    queryKey: queryKeys.gov.entries({
      category: category === "__all__" ? undefined : category,
      limit: 100,
      offset: 0,
    }),
    queryFn: () => {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      if (category !== "__all__") q.set("category", category);
      return apiFetch<{ items: CatalogEntry[]; total: number }>(
        `/api/v1/gov/catalog/entries?${q}`,
      );
    },
  });

  const categories = categoriesQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];

  return (
    <AdminPageShell
      title="接口分类目录"
      description="治理域 catalog 条目登记与七分法分类浏览（GOV-001）。"
    >
      {entriesQuery.isError ? (
        <ErrorBanner message={mapApiError(entriesQuery.error)} onRetry={() => void entriesQuery.refetch()} />
      ) : null}

      <div className="grid gap-2 sm:max-w-xs">
        <Label>分类筛选</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[900px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">名称</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">方法</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">路径</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">分类</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
            </tr>
          </thead>
          <tbody>
            {entriesQuery.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {entries.length === 0 && !entriesQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  暂无 catalog 条目
                </td>
              </tr>
            ) : null}
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{e.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="light" color="primary" size="sm">
                    {e.httpMethod}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                  {e.path}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {e.categoryCodes.map((c) => (
                      <Badge key={c} variant="light" color="light" size="sm">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
