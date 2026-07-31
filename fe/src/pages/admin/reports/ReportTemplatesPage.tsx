import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { FilePlus, FolderOpen, FolderPlus, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
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
import { CatalogTreeNode } from "./components/CatalogTreeNode";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";
import { TemplateDetailPanel } from "./components/TemplateDetailPanel";
import { useReportTemplates } from "./useReportTemplates";
import { PageErrorBanner } from "@/components/ui/page-error-banner";

export function ReportTemplatesPage() {
  const { nodeId } = useParams();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(nodeId ?? null);
  const { nodesQuery, createNode } = useReportTemplates(null);
  const readOnly = user?.roles?.length === 1 && user.roles[0] === "viewer";
  const nodes = nodesQuery.data?.items ?? [];
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (nodeId) setSelectedId(nodeId);
  }, [nodeId]);

  const handleCreate = (nodeType: "folder" | "template") => {
    createNode.mutate(
      {
        name: nodeType === "folder" ? "新建文件夹" : "新建模板",
        nodeType,
        templateKind: nodeType === "template" ? "word" : undefined,
      },
      { onError: (err) => toast.error(mapApiError(err)) },
    );
  };

  const createActions = !readOnly ? (
    <>
      <Button type="button" variant="outline" onClick={() => handleCreate("folder")}>
        <FolderPlus className="size-4" aria-hidden />
        新建文件夹
      </Button>
      <Button type="button" variant="primary" onClick={() => handleCreate("template")}>
        <FilePlus className="size-4" aria-hidden />
        新建模板
      </Button>
    </>
  ) : null;

  const catalogBody = nodesQuery.isLoading ? (
    <div className="space-y-2 px-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-lg" />
      ))}
    </div>
  ) : nodes.length === 0 ? (
    <ListGhostEmptyState
      layout="table"
      density="compact"
      rows={4}
      headingId="templates-catalog-empty"
      icon={<FolderOpen className="size-8" aria-hidden />}
      title="暂无模板目录"
      description="创建文件夹组织模板，或新建 Word / Excel / PDF 报表模板。"
      action={createActions}
    />
  ) : (
    <ScrollArea className="h-full max-h-[min(560px,calc(100vh-280px))] pr-2">
      <div className="space-y-0.5 px-1">
        {nodes.map((node) => (
          <CatalogTreeNode
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </div>
    </ScrollArea>
  );

  const detailBody =
    selected && selected.nodeType === "template" ? (
      <TemplateDetailPanel node={selected} readOnly={readOnly} />
    ) : (
      <ListGhostEmptyState
        layout="table"
        density="compact"
        rows={3}
        headingId="templates-detail-empty"
        icon={<MousePointerClick className="size-8" aria-hidden />}
        title={selectedId ? "请选择模板节点" : "从目录选择模板"}
        description={
          selectedId
            ? "当前选中的是文件夹，请展开目录并选择具体模板查看配置。"
            : "在左侧目录中选择 Word、Excel 或 PDF 模板，查看扩展配置、预览与调度。"
        }
      />
    );

  return (
    <AdminPageShell
      title="报表模板"
      description="管理 Word、Excel、PDF 报表模板与目录结构。"
      actions={nodes.length > 0 ? createActions : null}
    >
      {nodesQuery.isError ? (
        <PageErrorBanner message={mapApiError(nodesQuery.error)} onRetry={() => void nodesQuery.refetch()} />
      ) : null}

      <div className="mb-4 lg:hidden">
        <Select value={selectedId ?? "__none__"} onValueChange={(v) => setSelectedId(v === "__none__" ? null : v)}>
          <SelectTrigger aria-label="选择目录节点" className="h-11">
            <SelectValue placeholder="选择节点" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">选择节点…</SelectItem>
            {nodes.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.name}
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
        {nodes.length === 0 && !nodesQuery.isLoading ? (
          <div className="p-4">{catalogBody}</div>
        ) : (
          <div className="grid min-h-[560px] lg:grid-cols-[minmax(260px,300px)_1fr]">
            <aside className="hidden flex-col border-b border-gray-200 lg:flex lg:border-b-0 lg:border-r dark:border-gray-800">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">模板目录</h2>
                <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                  {nodes.length > 0 ? `${nodes.length} 个根节点` : "按文件夹组织报表"}
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-3">{catalogBody}</div>
            </aside>

            <section className="flex min-h-[280px] flex-col p-4">{detailBody}</section>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
