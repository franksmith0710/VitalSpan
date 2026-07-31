import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminFormCheckboxOption,
  AdminFormDialogBody,
  AdminFormDialogContent,
  AdminFormDialogDescription,
  AdminFormDialogFooter,
  AdminFormDialogHeader,
  AdminFormField,
} from "@/components/layout/admin-form-dialog";
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

const SURFACE_OPTIONS: { kind: VizSurfaceKind; label: string }[] = [
  { kind: "dashboard", label: "仪表板" },
  { kind: "data-screen", label: "数据大屏" },
];

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

  const toggleSurface = (kind: VizSurfaceKind, checked: boolean) => {
    setSurfaceKinds((prev) => {
      if (checked) {
        return prev.includes(kind) ? prev : [...prev, kind];
      }
      const next = prev.filter((item) => item !== kind);
      return next.length > 0 ? next : [kind];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AdminFormDialogContent>
        <AdminFormDialogHeader>
          <DialogTitle>新建组件</DialogTitle>
          <AdminFormDialogDescription>
            创建草稿并进入编辑；完成后可在 Hub 发布供看板/大屏复用。
          </AdminFormDialogDescription>
        </AdminFormDialogHeader>
        <AdminFormDialogBody>
          <AdminFormField label="名称" htmlFor="viz-component-name">
            <Input
              id="viz-component-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultVizComponentName(widgetType)}
            />
          </AdminFormField>
          <AdminFormField label="组件类型">
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
          </AdminFormField>
          <AdminFormField label="分类">
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
          </AdminFormField>
          <AdminFormField label="适用场景" hint="至少保留一项">
            <div className="grid gap-2 sm:grid-cols-2">
              {SURFACE_OPTIONS.map(({ kind, label }) => (
                <AdminFormCheckboxOption
                  key={kind}
                  id={`viz-surface-${kind}`}
                  label={label}
                  checked={surfaceKinds.includes(kind)}
                  onCheckedChange={(checked) => toggleSurface(kind, checked)}
                />
              ))}
            </div>
          </AdminFormField>
        </AdminFormDialogBody>
        <AdminFormDialogFooter>
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
            {createMutation.isPending ? "创建中…" : "创建并编辑"}
          </Button>
        </AdminFormDialogFooter>
      </AdminFormDialogContent>
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
