import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  auditActionLabel,
  auditTargetTypeLabel,
  formatAuditDetailPretty,
  formatAuditTimestamp,
  shortId,
  type AuditEventRow,
} from "./audit-display";

type AuditDetailSheetProps = {
  event: AuditEventRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 last:border-0 dark:border-white/[0.06]">
      <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-theme-sm text-gray-800 dark:text-white/90">{children}</dd>
    </div>
  );
}

export function AuditDetailSheet({ event, open, onOpenChange }: AuditDetailSheetProps) {
  const stamp = event ? formatAuditTimestamp(event.created_at) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-gray-100 pb-4 text-left dark:border-white/[0.06]">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
              <ClipboardList className="size-4" aria-hidden />
            </span>
            审计事件详情
          </SheetTitle>
          <SheetDescription>完整操作上下文与变更详情（已脱敏）。</SheetDescription>
        </SheetHeader>

        {event ? (
          <dl className="mt-4">
            <DetailRow label="时间">
              {stamp ? (
                <>
                  {stamp.date}
                  <span className="ml-2 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                    {stamp.time}
                  </span>
                </>
              ) : (
                event.created_at
              )}
            </DetailRow>
            <DetailRow label="操作">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="light" color="primary" size="sm">
                  {auditActionLabel(event.action)}
                </Badge>
                <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-theme-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
                  {event.action}
                </code>
              </div>
            </DetailRow>
            <DetailRow label="操作者">{event.actor_username ?? event.actor_id}</DetailRow>
            <DetailRow label="目标">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="light" color="light" size="sm">
                  {auditTargetTypeLabel(event.target_type)}
                </Badge>
                <span className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                  {event.target_id}
                </span>
              </div>
            </DetailRow>
            <DetailRow label="Trace ID">
              <code className="break-all font-mono text-theme-xs">{event.trace_id}</code>
            </DetailRow>
            <DetailRow label="事件 ID">
              <code className="break-all font-mono text-theme-xs">{shortId(event.id, 36)}</code>
            </DetailRow>
            <DetailRow label="变更详情">
              <pre className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-theme-xs leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
                {formatAuditDetailPretty(event.detail)}
              </pre>
            </DetailRow>
          </dl>
        ) : null}

        <div className="mt-6">
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
