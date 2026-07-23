import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapApiError } from "@/lib/apiError";
import {
  createTemplateFromDashboard,
  publishTemplate,
  type VizSurfaceKind,
} from "@/lib/dashboardTemplates";

type PublishTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  defaultName: string;
  surfaceKind: VizSurfaceKind;
  onPublished?: () => void;
};

export function PublishTemplateDialog({
  open,
  onOpenChange,
  dashboardId,
  defaultName,
  surfaceKind,
  onPublished,
}: PublishTemplateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");

  const publishMutation = useMutation({
    mutationFn: async () => {
      const created = await createTemplateFromDashboard({
        name: name.trim() || defaultName,
        description: description.trim() || undefined,
        surfaceKind,
        sourceDashboardId: dashboardId,
        visibility: "org",
      });
      return publishTemplate(created.id);
    },
    onSuccess: () => {
      toast.success("已发布为组织模板");
      onOpenChange(false);
      onPublished?.();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>发布为模板</DialogTitle>
          <DialogDescription>将当前布局保存到企业可视化模板库，供团队复用。</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            publishMutation.mutate();
          }}
        >
          <p className="grid gap-2">
            <Label htmlFor="tpl-name">模板名称</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
            />
          </p>
          <p className="grid gap-2">
            <Label htmlFor="tpl-desc">描述</Label>
            <textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="可选：说明适用场景"
              className="min-h-[80px] w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-theme-sm dark:border-gray-800"
            />
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={publishMutation.isPending}>
              {publishMutation.isPending ? "发布中…" : "发布"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
