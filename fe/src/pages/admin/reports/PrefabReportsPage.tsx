import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@/context/auth-context";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { ArrowLeft, ChevronDown, Lock, Search, Settings2 } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mapApiError } from "@/lib/apiError";
import { ApiRequestError } from "@/lib/api";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { cn } from "@/lib/utils";
import {
  PrefabReportsAdminSteps,
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
  const adminPanelRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);

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
  const isEmpty = !bindingsQuery.isLoading && bindings.length === 0;

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

  useEffect(() => {
    if (canManage && isEmpty) setAdminOpen(true);
  }, [canManage, isEmpty]);

  const scrollToAdmin = () => {
    setAdminOpen(true);
    requestAnimationFrame(() => {
      adminPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

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
                  className="h-11 max-w-md"
                  aria-label="搜索预制报表"
                  disabled={bindingsQuery.isLoading || bindings.length === 0}
                />
                {!bindingsQuery.isLoading && bindings.length > 0 ? (
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    共 {bindings.length} 条 · 筛选 {filteredBindings.length} 条
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
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : isEmpty ? (
              <PrefabReportsEmptyPreview isAdmin={canManage} onConfigure={scrollToAdmin} />
            ) : filteredBindings.length === 0 ? (
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
                onRun={(key) => runMutation.mutate(key)}
              />
            )}
          </ListPageTableFrame>
        </ListPageSection>

        {canManage ? (
          <div ref={adminPanelRef}>
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <Card className="overflow-hidden shadow-theme-xs">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
                      <Settings2 className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                        预制绑定配置
                        <ChevronDown
                          className={cn(
                            "size-4 text-gray-400 transition-transform",
                            adminOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </span>
                      <span className="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
                        高级：配置实体类型、分析模型与维度，供管理员维护系统预置分析。
                      </span>
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="border-t border-gray-100 pt-0 dark:border-gray-800">
                    {isEmpty ? (
                      <div className="mb-6 mt-5">
                        <PrefabReportsAdminSteps />
                      </div>
                    ) : null}
                    <PrefabBindingForm binding={bindings[0] ?? null} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        ) : null}

        {runForbidden ? (
          <Card className="shadow-theme-xs">
            <CardContent className="py-2">
              <PanelEmptyState
                icon={<Lock className="size-7" aria-hidden />}
                title="无权运行预制报表"
                description="当前账号没有运行该报表的权限，请联系管理员调整角色或绑定范围。"
                variant="framed"
                size="sm"
              />
            </CardContent>
          </Card>
        ) : null}

        {runMutation.isError && !runForbidden ? (
          <PageErrorBanner message={mapApiError(runMutation.error)} onRetry={() => runMutation.reset()} />
        ) : null}

        {runMutation.isPending ? (
          <Card className="shadow-theme-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-theme-sm">运行结果</CardTitle>
              <CardDescription>正在拉取分析数据…</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </CardContent>
          </Card>
        ) : null}

        {section ? (
          <Card className="shadow-theme-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-theme-sm">运行结果</CardTitle>
              <CardDescription>当前预制分析的数据预览</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px]">
              <ReportResultTable columns={section.columns} rows={section.rows} />
            </CardContent>
            {canManage ? (
              <CardContent className="border-t border-gray-100 pt-5 dark:border-gray-800">
                <ReportExportCard
                  embedded
                  showTemplateIdField
                  disabled={!section}
                />
              </CardContent>
            ) : null}
          </Card>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
