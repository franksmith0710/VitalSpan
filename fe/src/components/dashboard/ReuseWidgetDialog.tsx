import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { pixelWidgetToLayoutWidget } from "./dashboardCanvasMode";
import {
  coerceLayoutWidgets,
  type DashboardLayout,
  type LayoutWidget,
  type PixelLayoutWidget,
} from "./layoutUtils";
import { cloneLayoutWidget } from "./cloneLayoutWidget";
import { clonePixelLayoutWidget } from "./pixelCanvas/createPixelWidget";

type DashboardListItem = { id: string; name: string };

type ReuseWidgetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDashboardId?: string;
  widgets: LayoutWidget[];
  targetPixelWidgets?: PixelLayoutWidget[];
  onInsertCloned: (widget: LayoutWidget, sourcePixel?: PixelLayoutWidget) => void;
};

export function ReuseWidgetDialog({
  open,
  onOpenChange,
  currentDashboardId,
  widgets,
  targetPixelWidgets,
  onInsertCloned,
}: ReuseWidgetDialogProps) {
  const [dashboardId, setDashboardId] = useState<string>("");
  const [widgetId, setWidgetId] = useState<string>("");

  const { data: listData } = useQuery({
    queryKey: queryKeys.dashboards.list({ limit: 50, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DashboardListItem[] }>("/api/v1/dashboards?limit=50&offset=0"),
    enabled: open,
  });

  const { data: sourceDashboard, isFetching } = useQuery({
    queryKey: ["dashboards", "detail", dashboardId],
    queryFn: () =>
      apiFetch<{ layoutJson: DashboardLayout }>(`/api/v1/dashboards/${dashboardId}`),
    enabled: open && Boolean(dashboardId),
  });

  const sourceLayout = sourceDashboard?.layoutJson;
  const sourceWidgets = !sourceLayout
    ? []
    : sourceLayout.version === 1
      ? coerceLayoutWidgets(sourceLayout.widgets)
      : sourceLayout.widgets.map(pixelWidgetToLayoutWidget);

  const reusable = sourceWidgets.filter(
    (w) => !w.parentTabsId && w.type !== "tabs",
  );

  const handleConfirm = () => {
    if (sourceLayout?.version === 2) {
      const sourcePixel = sourceLayout.widgets.find((w) => w.id === widgetId);
      if (!sourcePixel) return;
      const clonedPixel = clonePixelLayoutWidget(
        sourcePixel,
        targetPixelWidgets ?? [],
      );
      onInsertCloned(pixelWidgetToLayoutWidget(clonedPixel), clonedPixel);
    } else {
      const source = sourceWidgets.find((w) => w.id === widgetId);
      if (!source) return;
      const cloned = cloneLayoutWidget(source, widgets);
      onInsertCloned(cloned);
    }
    onOpenChange(false);
    setDashboardId("");
    setWidgetId("");
  };

  const dashboards = (listData?.items ?? []).filter((d) => d.id !== currentDashboardId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="reuse-widget-dialog">
        <DialogHeader>
          <DialogTitle>复用组件</DialogTitle>
          <DialogDescription>从其他看板复制一个组件到当前画布（生成新 ID）。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>来源看板</Label>
            <Select value={dashboardId} onValueChange={(v) => { setDashboardId(v); setWidgetId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="选择看板" />
              </SelectTrigger>
              <SelectContent>
                {dashboards.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>组件</Label>
            <Select value={widgetId} onValueChange={setWidgetId} disabled={!dashboardId || isFetching}>
              <SelectTrigger>
                <SelectValue placeholder={isFetching ? "加载中…" : "选择组件"} />
              </SelectTrigger>
              <SelectContent>
                {reusable.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.title} ({w.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={!widgetId} onClick={handleConfirm}>
            插入副本
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
