import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import {
  ALLOWED_WORKFLOW_ROLES,
  nodeLabel,
  roleLabel,
  STANDARD_NODES,
  type WorkflowTemplate,
} from "./workflow-labels";

type CreateTemplateDialogProps = {
  onCreated: (id: string) => void;
};

export function CreateWorkflowTemplateDialog({ onCreated }: CreateTemplateDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("自定义查询发布");
  const [nodes, setNodes] = useState(STANDARD_NODES.map((n) => ({ ...n })));

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<WorkflowTemplate>("/api/v1/gov/workflow/templates", {
        method: "POST",
        body: JSON.stringify({ name, nodes }),
      }),
    onSuccess: (tpl) => {
      toast.success("自定义模板已创建");
      void qc.invalidateQueries({ queryKey: queryKeys.gov.workflowTemplates });
      onCreated(tpl.id);
      setOpen(false);
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="primary" size="sm">
          <Plus className="size-4" aria-hidden />
          创建自定义模板
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>基于标准模板创建</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="tpl-name">模板名称</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="space-y-3">
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"
              >
                <div>
                  <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    {nodeLabel(node.id)}
                  </p>
                  <p className="font-mono text-theme-xs text-gray-500">{node.id}</p>
                </div>
                <Select
                  value={node.role}
                  onValueChange={(role) =>
                    setNodes(nodes.map((n, i) => (i === index ? { ...n, role } : n)))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_WORKFLOW_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "提交中…" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
