import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardSchedulePanel } from "./DashboardSchedulePanel";
import {
  SCHEDULE_DELIVERY_HEALTH_KEY,
  SCHEDULE_EXPORT_HEALTH_KEY,
} from "./ScheduleExportHealthAlert";

type DashboardScheduleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceType: "dashboard" | "data_screen";
  sourceName: string;
  widgetCount?: number;
  readOnly?: boolean;
};

export function DashboardScheduleSheet({
  open,
  onOpenChange,
  sourceId,
  sourceType,
  sourceName,
  widgetCount,
  readOnly,
}: DashboardScheduleSheetProps) {
  const queryClient = useQueryClient();
  const label = sourceType === "data_screen" ? "大屏" : "看板";

  useEffect(() => {
    if (!open) return;
    void queryClient.invalidateQueries({ queryKey: SCHEDULE_EXPORT_HEALTH_KEY });
    void queryClient.invalidateQueries({ queryKey: SCHEDULE_DELIVERY_HEALTH_KEY });
  }, [open, queryClient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>定时推送</DialogTitle>
          <DialogDescription>
            为「{sourceName}」{label}配置定时 PDF 邮件推送
          </DialogDescription>
        </DialogHeader>
        <DashboardSchedulePanel
          sourceId={sourceId}
          sourceType={sourceType}
          sourceName={sourceName}
          widgetCount={widgetCount}
          readOnly={readOnly}
          embedded
          precheckActive={open}
        />
      </DialogContent>
    </Dialog>
  );
}
