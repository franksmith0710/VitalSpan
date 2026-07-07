import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CatalogTreeNode } from "./components/CatalogTreeNode";
import { TemplateDetailPanel } from "./components/TemplateDetailPanel";
import { useReportTemplates } from "./useReportTemplates";

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

export function ReportTemplatesPage() {
  const { nodeId } = useParams();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(nodeId ?? null);
  const { nodesQuery, createNode } = useReportTemplates(null);
  const readOnly = user?.roles?.length === 1 && user.roles[0] === "viewer";
  const nodes = nodesQuery.data?.items ?? [];
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

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

  const treePanel = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-theme-base">目录</CardTitle>
        {!readOnly ? (
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => handleCreate("folder")}>
              新建文件夹
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => handleCreate("template")}>
              新建模板
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {nodesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <p className="py-10 text-center text-theme-sm text-gray-600 dark:text-gray-400">暂无模板目录</p>
        ) : (
          <ScrollArea className="max-h-[480px] pr-2">
            <div className="space-y-0.5">
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
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminPageShell title="报表模板" description="管理 Word/Excel/PDF 报表模板与目录结构。">
      {nodesQuery.isError ? (
        <ErrorBanner message={mapApiError(nodesQuery.error)} onRetry={() => void nodesQuery.refetch()} />
      ) : null}
      <div className="mb-4 lg:hidden">
        <Select value={selectedId ?? "__none__"} onValueChange={(v) => setSelectedId(v === "__none__" ? null : v)}>
          <SelectTrigger aria-label="选择目录节点">
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
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">{treePanel}</div>
        {selected && selected.nodeType === "template" ? (
          <TemplateDetailPanel node={selected} readOnly={readOnly} />
        ) : (
          <Card>
            <CardContent className="flex min-h-[240px] items-center justify-center py-16 text-theme-sm text-gray-500 dark:text-gray-400">
              {selectedId ? "请选择模板节点查看详情" : "从左侧目录选择模板节点"}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPageShell>
  );
}
