import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { FilePlus, FolderOpen, FolderPlus, Info, MousePointerClick } from "lucide-react";
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
import type { TemplateKind } from "@/lib/reportCatalogProvision";
import { catalogAncestorFolderIds, catalogNodePath } from "@/lib/reportCatalogUtils";
import { cn } from "@/lib/utils";
import { CatalogFolderPanel } from "./components/CatalogFolderPanel";
import { CatalogTreeNode } from "./components/CatalogTreeNode";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";
import { TemplateDetailPanel } from "./components/TemplateDetailPanel";
import { type CatalogNode, fetchCatalogExtension, useAllCatalogNodes, useReportTemplates } from "./useReportTemplates";
import { queryKeys } from "@/lib/queryKeys";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FORMAT_OPTIONS: { id: TemplateKind; label: string }[] = [
  { id: "word", label: "Word" },
  { id: "excel", label: "Excel" },
  { id: "pdf", label: "PDF" },
];

export function ReportTemplatesPage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(nodeId ?? null);
  const [selectedOverride, setSelectedOverride] = useState<CatalogNode | null>(null);
  const [createFormat, setCreateFormat] = useState<TemplateKind>("word");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { nodesQuery, createNode, createTemplateNode, deleteNode, moveNode } = useReportTemplates(null);
  const allNodesQuery = useAllCatalogNodes();
  const readOnly = user?.roles?.length === 1 && user.roles[0] === "viewer";
  const nodes = nodesQuery.data?.items ?? [];
  const allNodes = allNodesQuery.data ?? [];
  const selected = useMemo(() => {
    if (selectedOverride?.id === selectedId) return selectedOverride;
    return allNodes.find((n) => n.id === selectedId) ?? nodes.find((n) => n.id === selectedId) ?? null;
  }, [allNodes, nodes, selectedId, selectedOverride]);
  const createParentId = selected?.nodeType === "folder" ? selected.id : null;

  const expandFolderIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedId) {
      for (const id of catalogAncestorFolderIds(selectedId, allNodes)) set.add(id);
    }
    if (createParentId) set.add(createParentId);
    return set;
  }, [selectedId, allNodes, createParentId]);

  useEffect(() => {
    if (nodeId) setSelectedId(nodeId);
  }, [nodeId]);

  const prefetchExtension = useCallback(
    (id: string) => {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.reports.extension(id),
        queryFn: () => fetchCatalogExtension(id),
        staleTime: 5 * 60_000,
      });
    },
    [queryClient],
  );

  const handleSelect = useCallback(
    (id: string | null) => {
      if (id) prefetchExtension(id);
      setSelectedId(id);
      setSelectedOverride(null);
      if (id) {
        navigate(`/admin/reports/templates/${id}`, { replace: true, preventScrollReset: true });
      } else {
        navigate("/admin/reports/templates", { replace: true, preventScrollReset: true });
      }
    },
    [navigate, prefetchExtension],
  );

  const handleCreateFolder = (parentId: string | null = createParentId) => {
    createNode.mutate(
      {
        name: "新建文件夹",
        nodeType: "folder",
        parentId,
      },
      {
        onSuccess: (created) => {
          setSelectedOverride(created);
          handleSelect(created.id);
          toast.success(parentId ? "已在文件夹内创建" : "已在根目录创建");
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  const handleCreateTemplate = (parentId: string | null = createParentId) => {
    createTemplateNode.mutate(
      { name: "新建模板", parentId, templateKind: createFormat },
      {
        onSuccess: (created) => {
          setSelectedOverride(created);
          handleSelect(created.id);
          toast.success(parentId ? "模板已创建到当前文件夹" : "模板已创建到根目录");
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  const handleMove = (id: string, parentId: string | null) => {
    moveNode.mutate(
      { id, parentId },
      {
        onSuccess: (moved) => {
          if (selectedId === id) setSelectedOverride(moved);
          toast.success("已移动");
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    deleteNode.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) handleSelect(null);
        setDeleteTargetId(null);
        toast.success("已删除");
      },
      onError: (err) => toast.error(mapApiError(err)),
    });
  };

  const deleteTarget =
    deleteTargetId != null
      ? allNodes.find((n) => n.id === deleteTargetId) ?? nodes.find((n) => n.id === deleteTargetId) ?? null
      : null;

  const createHint = createParentId
    ? `将在「${selected?.name ?? "当前文件夹"}」内创建`
    : "将在根目录创建";
  const isCreating = createNode.isPending || createTemplateNode.isPending;

  const createActions = !readOnly ? (
    <>
      <span className="hidden text-theme-xs text-gray-500 dark:text-gray-400 lg:inline">{createHint}</span>
      <Select value={createFormat} onValueChange={(v) => setCreateFormat(v as TemplateKind)}>
        <SelectTrigger className="h-10 w-[108px]" aria-label="新建模板格式">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FORMAT_OPTIONS.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" disabled={isCreating} onClick={() => handleCreateFolder()}>
        <FolderPlus className="size-4" aria-hidden />
        新建文件夹
      </Button>
      <Button type="button" variant="primary" disabled={isCreating} onClick={() => handleCreateTemplate()}>
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
            onSelect={handleSelect}
            allNodes={allNodes}
            allNodesLoaded={allNodesQuery.isSuccess}
            readOnly={readOnly}
            onMove={handleMove}
            onDelete={handleDelete}
            expandFolderIds={expandFolderIds}
            onPrefetch={prefetchExtension}
          />
        ))}
      </div>
    </ScrollArea>
  );

  const detailBody = selected?.nodeType === "template" ? (
    <TemplateDetailPanel
      node={selected}
      allNodes={allNodes}
      readOnly={readOnly}
      onDeleted={() => handleSelect(null)}
    />
  ) : selected?.nodeType === "folder" ? (
    <CatalogFolderPanel
      node={selected}
      allNodes={allNodes}
      readOnly={readOnly}
      isCreating={isCreating}
      onCreate={(nodeType) =>
        nodeType === "folder" ? handleCreateFolder(selected.id) : handleCreateTemplate(selected.id)
      }
      onSelectChild={handleSelect}
      onDeleted={() => handleSelect(null)}
    />
  ) : (
    <ListGhostEmptyState
      layout="table"
      density="compact"
      rows={3}
      headingId="templates-detail-empty"
      icon={<MousePointerClick className="size-8" aria-hidden />}
      title={selectedId ? "节点不存在或已删除" : "从目录选择模板"}
      description={
        selectedId
          ? "请从左侧目录重新选择，或刷新页面。"
          : "在左侧目录中选择 Word、Excel 或 PDF 模板，或选中文件夹后在此创建子项。"
      }
    />
  );

  const mobileOptions = allNodes.length > 0 ? allNodes : nodes;

  return (
    <AdminPageShell
      title="文档模板"
      description="固定版式文档报表（Word/Excel/PDF 套版填数），后续能力；看板/大屏定时 PDF 请从编辑页「定时推送」创建。"
      actions={nodes.length > 0 ? createActions : null}
    >
      <Alert severity="info" className="mb-4 border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/5">
        <Info className="size-4" aria-hidden />
        <AlertTitle>后续能力 · 非当前主路径</AlertTitle>
        <AlertDescription>
          当前报表主线为看板/大屏可视化 PDF 定时报告。本文档模板树保留管理与历史数据，不承担默认定时投递工作流。
        </AlertDescription>
      </Alert>
      {nodesQuery.isError ? (
        <PageErrorBanner message={mapApiError(nodesQuery.error)} onRetry={() => void nodesQuery.refetch()} />
      ) : null}

      <div className="mb-4 lg:hidden">
        <Select value={selectedId ?? "__none__"} onValueChange={(v) => handleSelect(v === "__none__" ? null : v)}>
          <SelectTrigger aria-label="选择目录节点" className="h-11">
            <SelectValue placeholder="选择节点" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">选择节点…</SelectItem>
            {mobileOptions.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {allNodes.length > 0 ? catalogNodePath(n, allNodes) : n.name}
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
                {!readOnly ? (
                  <p className="mt-1 text-theme-xs text-brand-600 dark:text-brand-400">{createHint}</p>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-3">{catalogBody}</div>
            </aside>

            <section className="flex min-h-[280px] flex-col p-4">{detailBody}</section>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleteTarget?.name ?? "节点"}」？
              {deleteTarget?.nodeType === "folder" ? "（须为空文件夹）" : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNode.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={deleteNode.isPending} onClick={confirmDelete}>
              {deleteNode.isPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
