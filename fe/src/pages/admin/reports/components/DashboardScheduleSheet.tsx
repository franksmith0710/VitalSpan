import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardSchedulePanel } from "./DashboardSchedulePanel";

type DashboardScheduleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceType: "dashboard" | "data_screen";
  sourceName: string;
  readOnly?: boolean;
};

export function DashboardScheduleSheet({
  open,
  onOpenChange,
  sourceId,
  sourceType,
  sourceName,
  readOnly,
}: DashboardScheduleSheetProps) {
  const label = sourceType === "data_screen" ? "大屏" : "看板";
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
          readOnly={readOnly}
          embedded
        />
      </DialogContent>
    </Dialog>
  );
}
