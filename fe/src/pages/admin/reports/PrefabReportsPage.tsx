import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@/context/auth-context";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { ArrowLeft, Database, Lock, Search } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mapApiError } from "@/lib/apiError";
import { ApiRequestError } from "@/lib/api";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import {
  PrefabReportsAdminOnboarding,
  PrefabReportsEmptyPreview,
} from "./components/PrefabReportsEmptyPreview";
import { PrefabBindingForm } from "./components/PrefabBindingForm";
import { PrefabBindingsTable } from "./components/PrefabBindingsTable";
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
  const [selectedBindingKey, setSelectedBindingKey] = useState<string | null>(null);
  const lastRunBindingRef = useRef<string | null>(null);

  const bindings = bindingsQuery.data?.items ?? [];
  const editingBinding = useMemo(() => {
    const key = selectedBindingKey ?? bindings[0]?.bindingKey ?? null;
    return bindings.find((b) => b.bindingKey === key) ?? null;
  }, [bindings, selectedBindingKey]);
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
  const runEntityNotReady =
    runMutation.isError &&
    runMutation.error instanceof ApiRequestError &&
    runMutation.error.code === "RPT_PREFAB_ENTITY_NOT_READY";
  const isEmpty = !bindingsQuery.isLoading && bindings.length === 0;
  const showRunPanel =
    runMutation.isPending ||
    Boolean(section) ||
    runForbidden ||
    runEntityNotReady ||
    (runMutation.isError && !runForbidden && !runEntityNotReady);

  const { mutate: runBinding, isPending: isRunning } = runMutation;

  useEffect(() => {
    if (bindings.length > 0 && !selectedBindingKey) {
      setSelectedBindingKey(bindings[0].bindingKey);
    }
  }, [bindings, selectedBindingKey]);

  useEffect(() => {
    autoRanBindingRef.current = null;
  }, [bindingFromUrl]);

  useEffect(() => {
    if (!bindingFromUrl || bindingsQuery.isLoading || bindings.length === 0 || isRunning) return;
    if (!bindings.some((b) => b.bindingKey === bindingFromUrl)) return;
    if (autoRanBindingRef.current === bindingFromUrl) return;
    autoRanBindingRef.current = bindingFromUrl;
    lastRunBindingRef.current = bindingFromUrl;
    runBinding(bindingFromUrl);
  }, [bindingFromUrl, bindings, bindingsQuery.isLoading, isRunning, runBinding]);

  const runResultSection = showRunPanel ? (
    <section className="space-y-3">
      <div>
        <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">运行结果</h2>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {runMutation.isPending ? "正在拉取分析数据…" : "当前预制分析的数据预览与导出。"}
        </p>
      </div>
      <Card className="shadow-theme-xs">
        <CardContent className="space-y-4 py-5">
          {runForbidden ? (
            <PanelEmptyState
              icon={<Lock className="size-7" aria-hidden />}
              title="无权运行预制报表"
              description="当前账号没有运行该报表的权限，请联系管理员调整角色或绑定范围。"
              variant="framed"
              size="sm"
            />
          ) : null}

          {runEntityNotReady ? (
            <PanelEmptyState
              icon={<Database className="size-7" aria-hidden />}
              title="实体数据尚未就绪"
              description={
                canManage
                  ? "当前实体类型尚无物理表，无法运行预制分析。请在元数据中注册实体表，或联系管理员启用演示数据。"
                  : "当前实体类型的物理表尚未配置，请联系管理员完成元数据注册或启用演示数据。"
              }
              variant="framed"
              size="sm"
            />
          ) : null}

          {runMutation.isError && !runForbidden && !runEntityNotReady ? (
            <PageErrorBanner
              message={mapApiError(runMutation.error)}
              onRetry={() => {
                const key = lastRunBindingRef.current ?? bindingFromUrl;
                if (key) runMutation.mutate(key);
                else runMutation.reset();
              }}
            />
          ) : null}

          {runMutation.isPending ? <Skeleton className="h-[200px] w-full rounded-xl" /> : null}

          {section ? (
            <div className="space-y-4">
              <div className="min-h-[200px] overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <ReportResultTable columns={section.columns} rows={section.rows} />
              </div>
              {canManage ? (
                <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                  <ReportExportCard embedded showTemplateIdField disabled={!section} />
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  ) : null;

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
      {bindingsQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(bindingsQuery.error)}
          onRetry={() => void bindingsQuery.refetch()}
        />
      ) : null}

      {bindingsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <>
          {canManage ? <PrefabReportsAdminOnboarding /> : <PrefabReportsEmptyPreview />}
        </>
      ) : (
        <>
          <ListPageSection>
            <ListPageToolbar
              filters={
                <>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索报表名称或分析类型…"
                    className="h-11 w-full sm:max-w-md"
                    aria-label="搜索预制报表"
                  />
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    共 {bindings.length} 条 · 筛选 {filteredBindings.length} 条
                  </span>
                </>
              }
            />
            <ListPageTableFrame>
              {filteredBindings.length === 0 ? (
                <PanelEmptyState
                  icon={<Search className="size-7" aria-hidden />}
                  title="无匹配报表"
                  description="请调整搜索词后重试。"
                  variant="framed"
                  size="sm"
                />
              ) : (
                <PrefabBindingsTable
                  bindings={filteredBindings}
                  runningKey={runningKey}
                  selectedKey={editingBinding?.bindingKey ?? null}
                  onSelect={setSelectedBindingKey}
                  onRun={(key) => {
                    lastRunBindingRef.current = key;
                    runMutation.mutate(key);
                  }}
                />
              )}
            </ListPageTableFrame>
          </ListPageSection>

          {canManage ? (
            <section className="space-y-3">
              <div>
                <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">预制绑定配置</h2>
                <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                  维护实体类型、分析模型与维度映射。
                </p>
              </div>
              <Card className="shadow-theme-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-theme-sm font-semibold">编辑绑定</CardTitle>
                  <CardDescription>修改后将影响 Hub 与运行时的分析模型。</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrefabBindingForm binding={editingBinding} />
                </CardContent>
              </Card>
            </section>
          ) : null}

          {runResultSection}
        </>
      )}
    </AdminPageShell>
  );
}
