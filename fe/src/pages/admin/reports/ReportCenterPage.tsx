import { type ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  CalendarClock,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  LayoutTemplate,
  Play,
  Star,
} from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { apiFetch } from "@/lib/api";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { resolveDefaultReportTemplateNodeId } from "@/lib/defaultViewResolve";
import { prefabReportsRunPath } from "./reportRoutes";
import { mapApiError } from "@/lib/apiError";
import {
  fetchAllCatalogTemplates,
  filterCatalogTemplates,
  type ReportCatalogNode,
} from "@/lib/reportCatalogUtils";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

type PrefabBinding = {
  bindingKey: string;
  displayName: string;
  analysisType: string;
};

type TemplateKindFilter = "all" | "word" | "excel" | "pdf";

const KIND_FILTERS: { id: TemplateKindFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "pdf", label: "PDF" },
  { id: "word", label: "Word" },
  { id: "excel", label: "Excel" },
];

const KIND_ICON: Record<string, ReactNode> = {
  word: <FileText className="size-5" aria-hidden />,
  excel: <FileSpreadsheet className="size-5" aria-hidden />,
  pdf: <FileBarChart className="size-5" aria-hidden />,
};

function TemplateKindBadge({ kind }: { kind: string | null }) {
  const label = kind?.toUpperCase() ?? "报表";
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
      {KIND_ICON[kind ?? ""]}
      {label}
    </span>
  );
}

function QuickLinkCard({
  title,
  description,
  to,
  icon,
}: {
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-colors",
        "hover:border-brand-200 hover:bg-brand-50/40 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {icon}
      </span>
      <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</span>
      <span className="text-theme-xs text-gray-500 dark:text-gray-400">{description}</span>
    </Link>
  );
}

function TemplateCard({ node }: { node: ReportCatalogNode }) {
  return (
    <Card className="shadow-theme-xs">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-theme-sm font-semibold leading-snug">{node.name}</CardTitle>
        <TemplateKindBadge kind={node.templateKind} />
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 pt-0">
        <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
          {node.templateKey ?? node.id.slice(0, 8)}
        </p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={`/admin/reports/view/${node.id}`}>
            <Play className="size-3.5" aria-hidden />
            查看
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function PrefabRow({ binding }: { binding: PrefabBinding }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
      <div className="min-w-0">
        <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{binding.displayName}</p>
        <p className="text-theme-xs text-gray-500">{binding.analysisType}</p>
      </div>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link to={prefabReportsRunPath(binding.bindingKey)} aria-label={`运行 ${binding.displayName}`}>
          运行
        </Link>
      </Button>
    </div>
  );
}

export function ReportCenterPage() {
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const roleCodes = user?.roles ?? [];
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<TemplateKindFilter>("all");

  const templatesQuery = useQuery({
    queryKey: ["reports", "center", "templates"],
    queryFn: fetchAllCatalogTemplates,
  });

  const prefabQuery = useQuery({
    queryKey: queryKeys.reports.prefabBindings,
    queryFn: () =>
      apiFetch<{ items: PrefabBinding[]; total: number }>("/api/v1/reports/prefab/bindings"),
    enabled: matchesCapability(caps, "report:read"),
  });

  const defaultReportQuery = useQuery({
    queryKey: ["reports", "center", "default-report", roleCodes.join(",")],
    queryFn: () => resolveDefaultReportTemplateNodeId(roleCodes),
    enabled: roleCodes.length > 0,
  });

  const canManage = matchesCapability(caps, "report:manage");
  const templates = templatesQuery.data ?? [];
  const prefabItems = prefabQuery.data?.items ?? [];
  const filteredTemplates = useMemo(
    () => filterCatalogTemplates(templates, search, kindFilter),
    [templates, search, kindFilter],
  );
  const defaultReportId = defaultReportQuery.data;
  const defaultReportNode = templates.find((node) => node.id === defaultReportId);

  return (
    <AdminPageShell
      title="报表中心"
      description="浏览授权报表、预制分析与模板，对标 DataEase 报表消费入口。"
    >
      {templatesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(templatesQuery.error)}
          onRetry={() => void templatesQuery.refetch()}
        />
      ) : null}

      {defaultReportNode ? (
        <Card className="mb-6 border-brand-200 bg-brand-50/30 dark:border-brand-500/30 dark:bg-brand-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <Star className="mt-0.5 size-5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              <div>
                <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">角色默认报表</p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">{defaultReportNode.name}</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="primary" asChild>
              <Link to={`/admin/reports/view/${defaultReportNode.id}`}>打开默认报表</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLinkCard
          title="预制报表"
          description={`${prefabItems.length} 个系统预置分析`}
          to="/admin/reports"
          icon={<FileBarChart className="size-5" aria-hidden />}
        />
        {canManage ? (
          <>
            <QuickLinkCard
              title="报表模板"
              description="管理 Word / Excel / PDF 模板目录"
              to="/admin/reports/templates"
              icon={<LayoutTemplate className="size-5" aria-hidden />}
            />
            <QuickLinkCard
              title="报表调度"
              description="定时生成与投递任务"
              to="/admin/reports/schedules"
              icon={<CalendarClock className="size-5" aria-hidden />}
            />
          </>
        ) : null}
      </div>

      {prefabItems.length > 0 ? (
        <section className="mb-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">预制分析</h2>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/admin/reports">查看全部</Link>
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {prefabItems.slice(0, 4).map((binding) => (
              <PrefabRow key={binding.bindingKey} binding={binding} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">授权报表模板</h2>
          {canManage ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/admin/reports/templates">管理模板</Link>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索报表名称或 templateKey…"
            className="max-w-md"
            aria-label="搜索报表"
          />
          <div className="flex flex-wrap gap-1">
            {KIND_FILTERS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={kindFilter === item.id ? "primary" : "outline"}
                onClick={() => setKindFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {templatesQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <PanelEmptyState
            icon={<FileBarChart className="size-7" aria-hidden />}
            title="暂无授权报表"
            description="管理员可在「报表模板」中创建模板；或使用「预制报表」运行系统预置分析。"
            action={
              <Button type="button" variant="primary" asChild>
                <Link to="/admin/reports">浏览预制报表</Link>
              </Button>
            }
            variant="framed"
          />
        ) : filteredTemplates.length === 0 ? (
          <PanelEmptyState
            title="无匹配报表"
            description="请调整搜索词或格式筛选。"
            variant="framed"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((node) => (
              <TemplateCard key={node.id} node={node} />
            ))}
          </div>
        )}
      </section>
    </AdminPageShell>
  );
}
