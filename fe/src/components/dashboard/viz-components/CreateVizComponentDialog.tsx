import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import {
  createVizComponent,
  VIZ_COMPONENT_CATEGORIES,
  type VizSurfaceKind,
  type VizWidgetType,
} from "@/lib/vizComponents";
import { defaultVizComponentName, defaultVizComponentPayload } from "@/lib/vizComponentDefaults";
import { widgetTypeLabel } from "./componentLabels";

const WIDGET_TYPES: VizWidgetType[] = ["chart", "filter", "text", "media"];

type CreateVizComponentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateVizComponentDialog({ open, onOpenChange }: CreateVizComponentDialogProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [widgetType, setWidgetType] = useState<VizWidgetType>("chart");
  const [categoryKey, setCategoryKey] = useState("general");
  const [surfaceKinds, setSurfaceKinds] = useState<VizSurfaceKind[]>([
    "dashboard",
    "data-screen",
  ]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim() || defaultVizComponentName(widgetType);
      return createVizComponent({
        name: trimmed,
        categoryKey,
        widgetType,
        surfaceKinds,
        payloadJson: defaultVizComponentPayload(widgetType),
        visibility: "org",
      });
    },
    onSuccess: (created) => {
      toast.success("组件已创建，进入编辑");
      onOpenChange(false);
      setName("");
      setWidgetType("chart");
      navigate(`/admin/viz-components/${created.id}/edit`);
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const toggleSurface = (kind: VizSurfaceKind) => {
    setSurfaceKinds((prev) => {
      if (prev.includes(kind)) {
        const next = prev.filter((item) => item !== kind);
        return next.length > 0 ? next : [kind];
      }
      return [...prev, kind];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建组件</DialogTitle>
          <DialogDescription>
            创建草稿组件并进入编辑页；配置完成后可在 Hub 发布，供看板/大屏复用。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="viz-component-name">名称</Label>
            <Input
              id="viz-component-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultVizComponentName(widgetType)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>组件类型</Label>
            <Select value={widgetType} onValueChange={(v) => setWidgetType(v as VizWidgetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {widgetTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
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
          </div>
          <div className="space-y-1.5">
            <Label>适用场景</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={surfaceKinds.includes("dashboard") ? "primary" : "outline"}
                onClick={() => toggleSurface("dashboard")}
              >
                仪表板
              </Button>
              <Button
                type="button"
                size="sm"
                variant={surfaceKinds.includes("data-screen") ? "primary" : "outline"}
                onClick={() => toggleSurface("data-screen")}
              >
                数据大屏
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Plus className="size-4" aria-hidden />
            创建并编辑
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateVizComponentButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="primary" className={className} onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        新建组件
      </Button>
      <CreateVizComponentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
