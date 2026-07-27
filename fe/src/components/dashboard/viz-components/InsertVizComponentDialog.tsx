import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
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
import { buildDashboardsListUrl } from "@/lib/dashboardsListQuery";
import { queryKeys } from "@/lib/queryKeys";
import type { VizComponentListItem } from "@/lib/vizComponents";
import type { DashboardSurfaceKind } from "@/lib/dataScreenLayout";

type DashboardListItem = { id: string; name: string };

type InsertVizComponentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: VizComponentListItem | null;
};

function resolveSurfaceKind(component: VizComponentListItem): DashboardSurfaceKind {
  if (component.surfaceKinds.includes("data-screen") && !component.surfaceKinds.includes("dashboard")) {
    return "data-screen";
  }
  return "dashboard";
}

function editPathFor(surfaceKind: DashboardSurfaceKind, dashboardId: string, componentId: string) {
  const base =
    surfaceKind === "data-screen"
      ? `/admin/data-screens/${dashboardId}/edit`
      : `/admin/dashboards/${dashboardId}/edit`;
  return `${base}?insertComponent=${encodeURIComponent(componentId)}`;
}

export function InsertVizComponentDialog({
  open,
  onOpenChange,
  component,
}: InsertVizComponentDialogProps) {
  const navigate = useNavigate();
  const [dashboardId, setDashboardId] = useState("");
  const surfaceKind = component ? resolveSurfaceKind(component) : "dashboard";

  const listQuery = useQuery({
    queryKey: queryKeys.dashboards.list({ limit: 100, offset: 0, surfaceKind }),
    queryFn: () =>
      apiFetch<{ items: DashboardListItem[] }>(
        buildDashboardsListUrl({ limit: 100, offset: 0, surfaceKind }),
      ),
    enabled: open && Boolean(component),
  });

  const dashboards = listQuery.data?.items ?? [];

  const handleConfirm = () => {
    if (!component || !dashboardId) return;
    navigate(editPathFor(surfaceKind, dashboardId, component.id));
    onOpenChange(false);
    setDashboardId("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setDashboardId("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>插入到看板</DialogTitle>
          <DialogDescription>
            选择目标{surfaceKind === "data-screen" ? "大屏" : "看板"}，将在编辑页自动插入组件「
            {component?.name ?? ""}」的链接引用。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label>目标{surfaceKind === "data-screen" ? "大屏" : "看板"}</Label>
          <Select value={dashboardId} onValueChange={setDashboardId} disabled={listQuery.isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={listQuery.isLoading ? "加载中…" : "选择看板"} />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!listQuery.isLoading && dashboards.length === 0 ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              暂无可用的{surfaceKind === "data-screen" ? "大屏" : "看板"}，请先创建。
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!dashboardId || !component}
            onClick={handleConfirm}
          >
            <LayoutDashboard className="size-4" aria-hidden />
            前往编辑并插入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
