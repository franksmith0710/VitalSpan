import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@/context/auth-context";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { ArrowLeft, Lock } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mapApiError } from "@/lib/apiError";
import { ApiRequestError } from "@/lib/api";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import { PrefabReportsEmptyPreview } from "./components/PrefabReportsEmptyPreview";
import { PrefabBindingForm } from "./components/PrefabBindingForm";
import { ReportExportCard } from "./components/ReportExportCard";
import { ReportResultTable } from "./components/ReportResultTable";
import { usePrefabReports } from "./usePrefabReports";
import { PREFAB_BINDING_QUERY } from "./reportRoutes";

export function PrefabReportsPage() {
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const canManage = matchesCapability(caps, "report:manage");
  const { bindingsQuery, runMutation } = usePrefabReports();
  const [searchParams] = useSearchParams();
  const bindingFromUrl = searchParams.get(PREFAB_BINDING_QUERY);
  const autoRanBindingRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");

  const bindings = bindingsQuery.data?.items ?? [];
  const filteredBindings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bindings;
    return bindings.filter(
      (binding) =>
        binding.displayName.toLowerCase().includes(q) ||
        binding.analysisType.toLowerCase().includes(q) ||
        binding.entityTypeCode.toLowerCase().includes(q),
    );
  }, [bindings, search]);
  const section = runMutation.data?.renderSpec.sections[0];
  const runningKey = runMutation.isPending ? runMutation.variables : null;
  const runForbidden =
    runMutation.isError &&
    runMutation.error instanceof ApiRequestError &&
    runMutation.error.code === "RPT_PREFAB_RUN_FORBIDDEN";

  const { mutate: runBinding, isPending: isRunning } = runMutation;

  useEffect(() => {
    autoRanBindingRef.current = null;
  }, [bindingFromUrl]);

  useEffect(() => {
    if (!bindingFromUrl || bindingsQuery.isLoading || bindings.length === 0 || isRunning) return;
    if (!bindings.some((b) => b.bindingKey === bindingFromUrl)) return;
    if (autoRanBindingRef.current === bindingFromUrl) return;
    autoRanBindingRef.current = bindingFromUrl;
    runBinding(bindingFromUrl);
  }, [bindingFromUrl, bindings, bindingsQuery.isLoading, isRunning, runBinding]);

  return (
    <AdminPageShell
      title="预制分析报表"
      description="浏览并运行系统预置的分析报表。"
      actions={
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/reports/center">
            <ArrowLeft className="size-4" aria-hidden />
            返回全部报表
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <ListPageSection>
          <ListPageToolbar
            filters={
              <>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索报表名称或分析类型…"
                  className="max-w-md"
                  aria-label="搜索预制报表"
                  disabled={bindingsQuery.isLoading || bindings.length === 0}
                />
                {!bindingsQuery.isLoading && bindings.length > 0 ? (
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    筛选结果 {filteredBindings.length} 条
                  </span>
                ) : null}
              </>
            }
          />

          {bindingsQuery.isError ? (
            <div className="shrink-0 border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
              <PageErrorBanner
                message={mapApiError(bindingsQuery.error)}
                onRetry={() => void bindingsQuery.refetch()}
              />
            </div>
          ) : null}

          <ListPageTableFrame>
            {bindingsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : bindings.length === 0 ? (
              <PrefabReportsEmptyPreview />
            ) : filteredBindings.length === 0 ? (
              <PanelEmptyState title="无匹配报表" description="请调整搜索词。" variant="framed" />
            ) : (
              <div className="overflow-x-only">
                <table className="min-w-[640px] w-full text-left text-theme-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">报表名称</th>
                      <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">分析类型</th>
                      <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">实体类型</th>
                      <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBindings.map((binding) => (
                      <tr
                        key={binding.bindingKey}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="px-4 py-3">
                          <TruncateHint
                            title={binding.displayName}
                            as="span"
                            className="font-medium text-gray-800 dark:text-white/90"
                          >
                            {binding.displayName}
                          </TruncateHint>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{binding.analysisType}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{binding.entityTypeCode}</td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={runningKey === binding.bindingKey}
                            aria-label={`运行报表 ${binding.displayName}`}
                            onClick={() => runMutation.mutate(binding.bindingKey)}
                          >
                            {runningKey === binding.bindingKey ? "运行中…" : "运行"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ListPageTableFrame>
        </ListPageSection>

        {canManage ? <PrefabBindingForm binding={bindings[0] ?? null} /> : null}

        {runForbidden ? (
          <Card>
            <CardContent>
              <PanelEmptyState
                icon={<Lock className="size-7" aria-hidden />}
                title="无权运行预制报表"
                description="当前账号没有运行该报表的权限，请联系管理员调整角色或绑定范围。"
                variant="framed"
              />
            </CardContent>
          </Card>
        ) : null}

        {runMutation.isError && !runForbidden ? (
          <PageErrorBanner message={mapApiError(runMutation.error)} onRetry={() => runMutation.reset()} />
        ) : null}

        {runMutation.isPending ? (
          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-[240px] w-full" />
            </CardContent>
          </Card>
        ) : null}

        {section ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-theme-base">运行结果</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[240px]">
              <ReportResultTable columns={section.columns} rows={section.rows} />
            </CardContent>
          </Card>
        ) : null}

        {canManage ? (
          <ReportExportCard
            showTemplateIdField
            disabled={!section}
            disabledHint={!section ? "请先运行预制分析；导出需指定报表模板 ID。" : undefined}
          />
        ) : null}
      </div>
    </AdminPageShell>
  );
}
