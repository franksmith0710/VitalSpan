import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mapApiError } from "@/lib/apiError";
import { readSurfaceKind } from "@/lib/dataScreenLayout";
import {
  createVizComponent,
  extractWidgetPayload,
  publishVizComponent,
  VIZ_COMPONENT_CATEGORIES,
  type VizSurfaceKind,
} from "@/lib/vizComponents";
import { queryKeys } from "@/lib/queryKeys";
import type { LayoutWidget } from "./layoutUtils";
import type { DashboardStyleConfig } from "./dashboardStyleConfig";
import { resolveLayoutWidget } from "@/lib/resolveVizComponent";
import type { VizComponentMap } from "@/lib/resolveVizComponent";

type PublishVizComponentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: LayoutWidget | null;
  styleConfig?: DashboardStyleConfig;
  componentMap?: VizComponentMap;
  onPublished?: (componentId: string) => void;
};

export function PublishVizComponentDialog({
  open,
  onOpenChange,
  widget,
  styleConfig,
  componentMap,
  onPublished,
}: PublishVizComponentDialogProps) {
  const queryClient = useQueryClient();
  const surfaceKind = readSurfaceKind(styleConfig);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryKey, setCategoryKey] = useState("general");
  const [visibility, setVisibility] = useState<"org" | "private">("org");
  const [surfaceKinds, setSurfaceKinds] = useState<VizSurfaceKind[]>([surfaceKind]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!widget || widget.type === "tabs") throw new Error("unsupported widget");
      const resolved = componentMap ? resolveLayoutWidget(widget, componentMap) : widget;
      const payload = extractWidgetPayload(resolved);
      const created = await createVizComponent({
        name: name.trim() || widget.title,
        description: description.trim() || undefined,
        categoryKey,
        widgetType: widget.type,
        surfaceKinds,
        payloadJson: payload,
        visibility,
      });
      return publishVizComponent(created.id);
    },
    onSuccess: (created) => {
      toast.success("已发布到组织组件库");
      void queryClient.invalidateQueries({ queryKey: queryKeys.vizComponents.all });
      onPublished?.(created.id);
      onOpenChange(false);
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && widget) {
          setName(widget.title);
          setDescription("");
          setCategoryKey("general");
          setVisibility("org");
          setSurfaceKinds([surfaceKind]);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" data-testid="publish-viz-component-dialog">
        <DialogHeader>
          <DialogTitle>发布到组件库</DialogTitle>
          <DialogDescription>
            将当前组件配置保存到组织库，其他看板与大屏可通过「复用」引用并自动同步。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            publishMutation.mutate();
          }}
        >
          <p className="grid gap-2">
            <Label htmlFor="vc-name">组件名称</Label>
            <Input id="vc-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </p>
          <p className="grid gap-2">
            <Label htmlFor="vc-desc">描述</Label>
            <Input
              id="vc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
            />
          </p>
          <p className="grid gap-2">
            <Label>分类</Label>
            <Select value={categoryKey} onValueChange={setCategoryKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIZ_COMPONENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.key} value={cat.key}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </p>
          <p className="grid gap-2">
            <Label>可见范围</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "org" | "private")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">组织内</SelectItem>
                <SelectItem value="private">仅自己</SelectItem>
              </SelectContent>
            </Select>
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!widget || publishMutation.isPending}>
              发布
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
