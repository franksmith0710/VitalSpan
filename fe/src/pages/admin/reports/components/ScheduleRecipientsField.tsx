import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { ScheduleRecipient } from "../useReportSchedules";

const ROLE_OPTIONS = [
  { value: "admin", label: "管理员" },
  { value: "analyst", label: "分析师" },
  { value: "viewer", label: "查看者" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidRecipient(row: ScheduleRecipient): boolean {
  if (!row.value.trim()) return false;
  if (row.type === "email") return EMAIL_RE.test(row.value.trim());
  return true;
}

export function hasValidRecipients(recipients: ScheduleRecipient[]): boolean {
  return recipients.some(isValidRecipient);
}

type ScheduleRecipientsFieldProps = {
  value: ScheduleRecipient[];
  onChange: (next: ScheduleRecipient[]) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function ScheduleRecipientsField({
  value,
  onChange,
  disabled,
  idPrefix = "schedule-recipient",
}: ScheduleRecipientsFieldProps) {
  const usersQuery = useQuery({
    queryKey: ["users", "schedule-recipients"],
    queryFn: () =>
      apiFetch<{ items: { id: string; username: string }[] }>("/api/v1/users?limit=200"),
    staleTime: 60_000,
  });
  const users = usersQuery.data?.items ?? [];

  const addRow = () => {
    onChange([...value, { type: "role", value: "admin" }]);
  };

  const updateRow = (index: number, patch: Partial<ScheduleRecipient>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>接收人</Label>
        {!disabled ? (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="size-3.5" aria-hidden />
            添加
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">
        {value.map((row, index) => (
          <div key={index} className="flex flex-wrap items-start gap-2">
            <Select
              value={row.type}
              onValueChange={(type) =>
                updateRow(index, {
                  type: type as ScheduleRecipient["type"],
                  value: type === "role" ? "admin" : "",
                })
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-11 w-[120px]" id={`${idPrefix}-type-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">角色</SelectItem>
                <SelectItem value="user">用户</SelectItem>
                <SelectItem value="email">邮箱</SelectItem>
              </SelectContent>
            </Select>
            {row.type === "role" ? (
              <Select
                value={row.value}
                onValueChange={(v) => updateRow(index, { value: v })}
                disabled={disabled}
              >
                <SelectTrigger className="h-11 min-w-[140px] flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {row.type === "user" ? (
              <Select
                value={row.value}
                onValueChange={(v) => updateRow(index, { value: v })}
                disabled={disabled || usersQuery.isLoading}
              >
                <SelectTrigger className="h-11 min-w-[160px] flex-1">
                  <SelectValue placeholder={usersQuery.isLoading ? "加载用户…" : "选择用户"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.username}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {row.type === "email" ? (
              <Input
                type="email"
                className="h-11 min-w-[180px] flex-1"
                placeholder="name@example.com"
                value={row.value}
                disabled={disabled}
                onChange={(e) => updateRow(index, { value: e.target.value })}
                aria-invalid={row.value.length > 0 && !isValidRecipient(row)}
              />
            ) : null}
            {!disabled && value.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="删除接收人"
                onClick={() => removeRow(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      {!hasValidRecipients(value) ? (
        <p className="text-theme-xs text-error-500">请至少配置一位有效接收人</p>
      ) : null}
    </div>
  );
}

export const DEFAULT_RECIPIENTS: ScheduleRecipient[] = [{ type: "role", value: "admin" }];
