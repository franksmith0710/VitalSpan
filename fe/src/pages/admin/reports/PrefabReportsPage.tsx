import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/context/auth-context";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { BarChart3 } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { ReportCenterBackLink } from "./components/ReportCenterBackLink";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { mapApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import {
  PrefabReportsAdminOnboarding,
  PrefabReportsEmptyPreview,
} from "./components/PrefabReportsEmptyPreview";
import { PrefabBindingsList, PrefabBindingsListEmpty } from "./components/PrefabBindingsList";
import { PrefabReportDetailPanel } from "./components/PrefabReportDetailPanel";
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
  const runningKey = runMutation.isPending ? runMutation.variables : null;
  const isEmpty = !bindingsQuery.isLoading && bindings.length === 0;

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
    setSelectedBindingKey(bindingFromUrl);
    lastRunBindingRef.current = bindingFromUrl;
    runBinding(bindingFromUrl);
  }, [bindingFromUrl, bindings, bindingsQuery.isLoading, isRunning, runBinding]);

  const handleRun = (key: string) => {
    lastRunBindingRef.current = key;
    setSelectedBindingKey(key);
    runMutation.mutate(key);
  };

  const listBody = bindingsQuery.isLoading ? (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
      ))}
    </div>
  ) : filteredBindings.length === 0 ? (
    <PrefabBindingsListEmpty />
  ) : (
    <PrefabBindingsList
      bindings={filteredBindings}
      runningKey={runningKey}
      selectedKey={editingBinding?.bindingKey ?? null}
      onSelect={setSelectedBindingKey}
      onRun={handleRun}
    />
  );

  return (
    <AdminPageShell
      title="预制分析报表"
      description="浏览并运行系统预置的分析报表，支持实体生命周期、分布等标准模型。"
      actions={<ReportCenterBackLink label="返回全部报表" />}
    >
      {bindingsQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(bindingsQuery.error)}
          onRetry={() => void bindingsQuery.refetch()}
        />
      ) : null}

      {isEmpty ? (
        canManage ? <PrefabReportsAdminOnboarding /> : <PrefabReportsEmptyPreview />
      ) : (
        <>
          <div className="mb-4 space-y-3 lg:hidden">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索名称、类型或实体…"
              className="h-11"
              aria-label="搜索预制报表"
            />
            <Select
              value={editingBinding?.bindingKey ?? "__none__"}
              onValueChange={(v) => setSelectedBindingKey(v === "__none__" ? null : v)}
            >
              <SelectTrigger aria-label="选择预制报表" className="h-11">
                <SelectValue placeholder="选择预制报表…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">选择预制报表…</SelectItem>
                {bindings.map((b) => (
                  <SelectItem key={b.bindingKey} value={b.bindingKey}>
                    {b.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm",
              "dark:border-gray-800 dark:bg-white/[0.03]",
            )}
          >
            <div className="grid min-h-[560px] lg:grid-cols-[minmax(280px,340px)_1fr]">
              <aside className="hidden flex-col border-b border-gray-200 lg:flex lg:border-b-0 lg:border-r dark:border-gray-800">
                <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200/80 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/25">
                      <BarChart3 className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white">预制报表</h2>
                      <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                        共 {bindings.length} 条
                        {search.trim() ? ` · 筛选 ${filteredBindings.length} 条` : null}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="搜索名称、类型或实体…"
                      className="h-11"
                      aria-label="搜索预制报表"
                    />
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1 p-3">
                  {listBody}
                </ScrollArea>
              </aside>

              <section className="flex min-h-[280px] flex-col">
                <PrefabReportDetailPanel
                  binding={editingBinding}
                  canManage={canManage}
                  runningKey={runningKey}
                  onRun={handleRun}
                  runMutation={runMutation}
                  lastRunBindingRef={lastRunBindingRef}
                  bindingFromUrl={bindingFromUrl}
                />
              </section>
            </div>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
