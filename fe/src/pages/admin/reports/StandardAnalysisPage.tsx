import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Settings2, TrendingUp } from "lucide-react";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import { ListPageSection } from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { useAuth } from "@/context/auth-context";
import { ReportCenterBackLink } from "./components/ReportCenterBackLink";
import { StandardAnalysisPackList } from "./components/StandardAnalysisPackList";
import { StandardAnalysisResultPanel } from "./components/StandardAnalysisResultPanel";
import { STANDARD_WORKBENCH_GRID_CLASS } from "./components/standardAnalysisUi";
import {
  type AnalysisTheme,
  useCaptureStandardSnapshot,
  useStandardCompare,
  useStandardPacks,
  useStandardRun,
  useStandardSnapshots,
} from "./useStandardAnalysis";
import { STANDARD_PACK_QUERY, standardAnalysisConfigPath } from "./standardRoutes";

export function StandardAnalysisPage() {
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const canManage = matchesCapability(caps, "report:manage");
  const [searchParams] = useSearchParams();
  const packsQuery = useStandardPacks();
  const packs = packsQuery.data?.items ?? [];
  const packFromUrl = searchParams.get(STANDARD_PACK_QUERY);
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(packFromUrl);
  const [selectedTheme, setSelectedTheme] = useState<AnalysisTheme | null>(null);
  const [viewMode, setViewMode] = useState<"live" | "compare">("live");

  useEffect(() => {
    if (packFromUrl) {
      setSelectedPackKey(packFromUrl);
    }
  }, [packFromUrl]);

  const activePack = useMemo(
    () => packs.find((p) => p.packKey === selectedPackKey) ?? packs[0] ?? null,
    [packs, selectedPackKey],
  );

  const activeTheme = selectedTheme ?? activePack?.enabledThemes[0] ?? null;

  const runQuery = useStandardRun(viewMode === "live" ? activePack?.packKey ?? null : null, activeTheme);
  const compareQuery = useStandardCompare(
    viewMode === "compare" ? activePack?.packKey ?? null : null,
    activeTheme,
  );
  const snapshotsQuery = useStandardSnapshots(activePack?.packKey ?? null, activeTheme);
  const captureSnapshot = useCaptureStandardSnapshot();

  const handleCaptureSnapshot = () => {
    if (!activePack || !activeTheme) return;
    captureSnapshot.mutate({ packKey: activePack.packKey, theme: activeTheme });
  };

  const selectPack = (key: string) => {
    setSelectedPackKey(key);
    setSelectedTheme(null);
  };

  return (
    <AdminPageShell
      layout="list"
      icon={
        <AdminPageHeaderIcon>
          <TrendingUp className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      title="标准分析"
      description="查看分析结果并与上期快照对比；管理员可点击右上角「管理分析包」配置数据集与快照。"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ReportCenterBackLink />
          {canManage ? (
            <Button variant="primary" size="sm" asChild>
              <Link to={standardAnalysisConfigPath(activePack?.packKey)}>
                <Settings2 className="size-4" aria-hidden />
                管理分析包
              </Link>
            </Button>
          ) : null}
        </div>
      }
    >
      {packs.length === 0 && !packsQuery.isLoading ? (
        <ListGhostEmptyState
          title="暂无分析包"
          description={canManage ? "前往配置页创建第一个标准分析包。" : "请联系管理员配置标准分析包。"}
          action={
            canManage ? (
              <Button size="sm" asChild>
                <Link to={standardAnalysisConfigPath()}>去配置</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListPageSection className="min-h-0 flex-1">
          {packsQuery.isError ? (
            <div className="shrink-0 border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
              <PageErrorBanner message={mapApiError(packsQuery.error)} onRetry={() => packsQuery.refetch()} />
            </div>
          ) : null}

          <div className="border-b border-gray-200 px-4 py-3 xl:hidden dark:border-gray-800">
            <Select value={activePack?.packKey ?? ""} onValueChange={selectPack}>
              <SelectTrigger aria-label="选择分析包" className="h-11">
                <SelectValue placeholder="选择分析包" />
              </SelectTrigger>
              <SelectContent>
                {packs.map((pack) => (
                  <SelectItem key={pack.packKey} value={pack.packKey}>
                    {pack.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={STANDARD_WORKBENCH_GRID_CLASS}>
            <div className="hidden min-h-0 min-w-0 overflow-hidden xl:flex">
              <StandardAnalysisPackList
                packs={packs}
                activePackKey={activePack?.packKey ?? null}
                isLoading={packsQuery.isLoading}
                onSelect={selectPack}
              />
            </div>
            {activePack && activeTheme ? (
              <StandardAnalysisResultPanel
                pack={activePack}
                activeTheme={activeTheme}
                viewMode={viewMode}
                canManage={canManage}
                capturePending={captureSnapshot.isPending}
                onCaptureSnapshot={handleCaptureSnapshot}
                onThemeChange={setSelectedTheme}
                onViewModeChange={setViewMode}
                runQuery={runQuery}
                compareQuery={compareQuery}
                snapshots={snapshotsQuery.data?.items}
                mapError={mapApiError}
              />
            ) : null}
          </div>
        </ListPageSection>
      )}
    </AdminPageShell>
  );
}
