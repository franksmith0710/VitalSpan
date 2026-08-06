import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mapApiError } from "@/lib/apiError";
import {
  buildCatalogMoveTargets,
  catalogNodePath,
  type ReportCatalogNode,
} from "@/lib/reportCatalogUtils";
import { type CatalogNode, useReportTemplates } from "../useReportTemplates";

export function CatalogNodeMetaPanel({
  node,
  allNodes,
  readOnly,
  onRenamed,
  onDeleted,
  onMoved,
}: {
  node: CatalogNode;
  allNodes: ReportCatalogNode[];
  readOnly: boolean;
  onRenamed?: () => void;
  onDeleted?: () => void;
  onMoved?: () => void;
}) {
  const [name, setName] = useState(node.name);
  const [moveTarget, setMoveTarget] = useState<string>("__keep__");
  const { updateNode, deleteNode, moveNode } = useReportTemplates(null);
  const moveTargets = buildCatalogMoveTargets(node.id, allNodes);
  const parentPath = node.parentId
    ? catalogNodePath(
        allNodes.find((n) => n.id === node.parentId) ?? { ...node, name: "…", parentId: null },
        allNodes,
      )
    : "根目录";

  useEffect(() => {
    setName(node.name);
    setMoveTarget("__keep__");
  }, [node.id, node.name]);

  if (readOnly) {
    return (
      <dl className="grid gap-3 text-theme-sm text-gray-600 dark:text-gray-400">
        <div>
          <dt className="text-theme-xs text-gray-500">所在目录</dt>
          <dd className="mt-0.5 font-medium text-gray-800 dark:text-white/90">{parentPath}</dd>
        </div>
      </dl>
    );
  }

  const handleRename = () => {
    const next = name.trim();
    if (!next || next === node.name) return;
    updateNode.mutate(
      { id: node.id, body: { name: next } },
      {
        onSuccess: () => {
          toast.success("名称已更新");
          onRenamed?.();
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  const handleDelete = () => {
    if (!window.confirm(`确定删除「${node.name}」？${node.nodeType === "folder" ? "（须为空文件夹）" : ""}`)) {
      return;
    }
    deleteNode.mutate(node.id, {
      onSuccess: () => {
        toast.success("已删除");
        onDeleted?.();
      },
      onError: (err) => toast.error(mapApiError(err)),
    });
  };

  const handleMove = () => {
    if (moveTarget === "__keep__") return;
    const parentId = moveTarget === "__root__" ? null : moveTarget;
    moveNode.mutate(
      { id: node.id, parentId },
      {
        onSuccess: () => {
          toast.success("已移动");
          setMoveTarget("__keep__");
          onMoved?.();
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <div className="grid gap-2">
        <Label htmlFor={`node-name-${node.id}`}>显示名称</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id={`node-name-${node.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-md"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={updateNode.isPending || !name.trim() || name.trim() === node.name}
            onClick={handleRename}
          >
            保存名称
          </Button>
        </div>
      </div>
      <div className="grid gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
        <span>所在目录：{parentPath}</span>
        {node.templateKey ? <span className="font-mono">模板键：{node.templateKey}</span> : null}
      </div>
      {moveTargets.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor={`move-${node.id}`}>移动到</Label>
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger id={`move-${node.id}`} className="h-11">
                <SelectValue placeholder="选择目标目录" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__keep__">选择目标…</SelectItem>
                {moveTargets.map((t) => (
                  <SelectItem key={t.id ?? "root"} value={t.id ?? "__root__"}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={moveNode.isPending || moveTarget === "__keep__"}
            onClick={handleMove}
          >
            确认移动
          </Button>
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="text-error-600 hover:text-error-700 dark:text-error-400"
        disabled={deleteNode.isPending}
        onClick={handleDelete}
      >
        <Trash2 className="size-4" aria-hidden />
        删除{node.nodeType === "folder" ? "文件夹" : "模板"}
      </Button>
    </div>
  );
}
