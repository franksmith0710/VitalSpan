import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DashboardStyleConfig } from "./layoutUtils";

type DashboardStyleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DashboardStyleConfig;
  onApply: (value: DashboardStyleConfig) => void;
};

export function DashboardStyleDialog({
  open,
  onOpenChange,
  value,
  onApply,
}: DashboardStyleDialogProps) {
  const [gap, setGap] = useState(value.widgetGap ?? 8);
  const [bg, setBg] = useState(value.canvasBackground ?? "");

  useEffect(() => {
    if (open) {
      setGap(value.widgetGap ?? 8);
      setBg(value.canvasBackground ?? "");
    }
  }, [open, value.widgetGap, value.canvasBackground]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="dashboard-style-dialog">
        <DialogHeader>
          <DialogTitle>仪表板样式</DialogTitle>
          <DialogDescription>调整画布背景与组件间距（保存布局后持久化）。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="style-gap">组件间距 (px)</Label>
            <Input
              id="style-gap"
              type="number"
              min={0}
              max={48}
              value={gap}
              onChange={(e) => setGap(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="style-bg">画布背景色</Label>
            <Input
              id="style-bg"
              value={bg}
              placeholder="#f8fafc 或 transparent"
              onChange={(e) => setBg(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply({ widgetGap: gap, canvasBackground: bg || undefined });
              onOpenChange(false);
            }}
          >
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
