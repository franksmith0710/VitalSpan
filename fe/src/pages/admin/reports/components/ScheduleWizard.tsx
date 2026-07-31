import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  WEEKDAY_LABELS,
  cronFromWizard,
  describeCron,
  type ScheduleWizardState,
} from "@/lib/scheduleCronWizard";

type ScheduleWizardProps = {
  value: ScheduleWizardState;
  onChange: (next: ScheduleWizardState) => void;
  disabled?: boolean;
  showAdvancedCron?: boolean;
  cron?: string;
  onCronChange?: (cron: string) => void;
};

export function ScheduleWizard({
  value,
  onChange,
  disabled,
  showAdvancedCron,
  cron,
  onCronChange,
}: ScheduleWizardProps) {
  const preview = describeCron(cron ?? cronFromWizard(value));

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>频率</Label>
          <Select
            value={value.frequency}
            onValueChange={(frequency) =>
              onChange({ ...value, frequency: frequency as ScheduleWizardState["frequency"] })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">每天</SelectItem>
              <SelectItem value="weekly">每周</SelectItem>
              <SelectItem value="monthly">每月</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>执行时间</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={23}
              value={value.hour}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, hour: Number(e.target.value) })}
              aria-label="小时"
            />
            <Input
              type="number"
              min={0}
              max={59}
              value={value.minute}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, minute: Number(e.target.value) })}
              aria-label="分钟"
            />
          </div>
        </div>
      </div>
      {value.frequency === "weekly" ? (
        <div className="grid gap-2">
          <Label>星期</Label>
          <Select
            value={String(value.weekday)}
            onValueChange={(v) => onChange({ ...value, weekday: Number(v) })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((label, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  周{label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {value.frequency === "monthly" ? (
        <div className="grid gap-2">
          <Label>每月第几天</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={value.dayOfMonth}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, dayOfMonth: Number(e.target.value) })}
          />
        </div>
      ) : null}
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">预览：{preview}</p>
      {showAdvancedCron && onCronChange ? (
        <div className="grid gap-2">
          <Label htmlFor="schedule-cron-advanced">高级 Cron</Label>
          <Input
            id="schedule-cron-advanced"
            value={cron ?? cronFromWizard(value)}
            onChange={(e) => onCronChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}

export { cronFromWizard, describeCron };
