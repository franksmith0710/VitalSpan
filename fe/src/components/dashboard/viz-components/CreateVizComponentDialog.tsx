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
import { ChartPickerPopover } from "@/components/dashboard/ChartPickerPopover";
import {
  HUB_SEGMENTED_BUTTON_CLASS,
  HUB_SEGMENTED_SHELL_CLASS,
} from "@/components/dashboard/hubFilterUi";
import { mapApiError } from "@/lib/apiError";
import type { ChartType } from "@/lib/chartViewConfig";
import {
  createVizComponent,
  VIZ_COMPONENT_CATEGORIES,
  type VizSurfaceKind,
  type VizWidgetType,
} from "@/lib/vizComponents";
import { defaultVizComponentName, defaultVizComponentPayload } from "@/lib/vizComponentDefaults";
import { cn } from "@/lib/utils";
import { widgetTypeLabel } from "./componentLabels";

const WIDGET_TYPES: VizWidgetType[] = ["chart", "filter", "text", "media"];

const SURFACE_OPTIONS: { kind: VizSurfaceKind; label: string }[] = [
  { kind: "dashboard", label: "仪表板" },
  { kind: "data-screen", label: "数据大屏" },
];

/** 与 ChartPickerPopover 一致，切换组件类型时保持弹窗高度稳定 */
const TYPE_PICKER_SLOT_CLASS = "h-[min(45vh,360px)] min-h-[280px]";

const TYPE_PICKER_HINT: Record<VizWidgetType, string | undefined> = {
  chart: "与看板/大屏编辑页图表面板一致",
  filter: "创建后可在编辑页配置筛选字段",
  text: "创建后可在编辑页编辑富文本内容",
  media: "创建后可在编辑页上传图片或视频",
};

const TYPE_PICKER_LABEL: Record<VizWidgetType, string> = {
  chart: "图表类型",
  filter: "筛选器",
  text: "富文本",
  media: "媒体",
};

type CreateVizComponentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function resetCreateFormState() {
  return {
    name: "",
    widgetType: "chart" as VizWidgetType,
    chartType: "bar" as ChartType,
    categoryKey: "general",
    surfaceKinds: ["dashboard", "data-screen"] as VizSurfaceKind[],
  };
}

export function CreateVizComponentDialog({ open, onOpenChange }: CreateVizComponentDialogProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [widgetType, setWidgetType] = useState<VizWidgetType>("chart");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [categoryKey, setCategoryKey] = useState("general");
  const [surfaceKinds, setSurfaceKinds] = useState<VizSurfaceKind[]>([
    "dashboard",
    "data-screen",
  ]);

  const chartDefaults = { chartType };

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmed =
        name.trim() ||
        defaultVizComponentName(widgetType, widgetType === "chart" ? chartDefaults : undefined);
      return createVizComponent({
        name: trimmed,
        categoryKey,
        widgetType,
        surfaceKinds,
        payloadJson: defaultVizComponentPayload(
          widgetType,
          widgetType === "chart" ? chartDefaults : undefined,
        ),
        visibility: "org",
      });
    },
    onSuccess: (created) => {
      toast.success("组件已创建，进入编辑");
      handleOpenChange(false);
      navigate(`/admin/viz-components/${created.id}/edit`);
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      const reset = resetCreateFormState();
      setName(reset.name);
      setWidgetType(reset.widgetType);
      setChartType(reset.chartType);
      setCategoryKey(reset.categoryKey);
      setSurfaceKinds(reset.surfaceKinds);
    }
    onOpenChange(next);
  };

  const toggleSurface = (kind: VizSurfaceKind, checked: boolean) => {
    setSurfaceKinds((prev) => {
      if (checked) {
        return prev.includes(kind) ? prev : [...prev, kind];
      }
      const next = prev.filter((item) => item !== kind);
      return next.length > 0 ? next : [kind];
    });
  };

  const isChart = widgetType === "chart";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <AdminFormDialogContent size="lg" scrollable className="sm:max-w-[540px]">
        <AdminFormDialogHeader>
          <DialogTitle>新建组件</DialogTitle>
          <AdminFormDialogDescription>
            创建草稿并进入编辑；完成后可在 Hub 发布供看板/大屏复用。
          </AdminFormDialogDescription>
        </AdminFormDialogHeader>
        <AdminFormDialogBody scrollable>
          <AdminFormField label="名称" htmlFor="viz-component-name">
            <Input
              id="viz-component-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultVizComponentName(
                widgetType,
                isChart ? chartDefaults : undefined,
              )}
            />
          </AdminFormField>
          <AdminFormField label="组件类型">
            <div
              role="group"
              aria-label="组件类型"
              className={cn(HUB_SEGMENTED_SHELL_CLASS, "flex flex-wrap gap-0.5")}
            >
              {WIDGET_TYPES.map((type) => {
                const active = widgetType === type;
                return (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    variant={active ? "subtle" : "ghost"}
                    className={HUB_SEGMENTED_BUTTON_CLASS}
                    onClick={() => setWidgetType(type)}
                  >
                    {widgetTypeLabel(type)}
                  </Button>
                );
              })}
            </div>
          </AdminFormField>
          <AdminFormField label={TYPE_PICKER_LABEL[widgetType]} hint={TYPE_PICKER_HINT[widgetType]}>
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800",
                TYPE_PICKER_SLOT_CLASS,
              )}
            >
              <div className={cn("absolute inset-0", !isChart && "hidden")} aria-hidden={!isChart}>
                <ChartPickerPopover
                  selectedType={chartType}
                  enableDrag={false}
                  className="h-full min-h-0"
                  onInsert={setChartType}
                />
              </div>
              <div
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-2 px-6 text-center",
                  isChart && "hidden",
                )}
                aria-hidden={isChart}
              >
                <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  {widgetTypeLabel(widgetType)}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {TYPE_PICKER_HINT[widgetType]}
                </p>
              </div>
            </div>
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
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
