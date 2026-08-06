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
  idPrefix?: string;
};

export function ScheduleWizard({
  value,
  onChange,
  disabled,
  showAdvancedCron,
  cron,
  onCronChange,
  idPrefix = "schedule-wizard",
}: ScheduleWizardProps) {
  const preview = describeCron(cron ?? cronFromWizard(value));

  const clampHour = (raw: number) => Math.min(23, Math.max(0, Number.isFinite(raw) ? raw : 0));
  const clampMinute = (raw: number) => Math.min(59, Math.max(0, Number.isFinite(raw) ? raw : 0));
  const hourInvalid = value.hour < 0 || value.hour > 23;
  const minuteInvalid = value.minute < 0 || value.minute > 59;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-frequency`}>频率</Label>
          <Select
            value={value.frequency}
            onValueChange={(frequency) =>
              onChange({ ...value, frequency: frequency as ScheduleWizardState["frequency"] })
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-frequency`} className="h-11">
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
              id={`${idPrefix}-hour`}
              type="number"
              min={0}
              max={23}
              className="h-11"
              value={value.hour}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, hour: clampHour(Number(e.target.value)) })}
              aria-label="小时"
              aria-invalid={hourInvalid}
            />
            <Input
              id={`${idPrefix}-minute`}
              type="number"
              min={0}
              max={59}
              className="h-11"
              value={value.minute}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, minute: clampMinute(Number(e.target.value)) })}
              aria-label="分钟"
              aria-invalid={minuteInvalid}
            />
          </div>
          {hourInvalid || minuteInvalid ? (
            <p className="text-theme-xs text-error-500">小时须为 0–23，分钟须为 0–59</p>
          ) : null}
        </div>
      </div>
      {value.frequency === "weekly" ? (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-weekday`}>星期</Label>
          <Select
            value={String(value.weekday)}
            onValueChange={(v) => onChange({ ...value, weekday: Number(v) })}
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-weekday`} className="h-11">
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
          <Label htmlFor={`${idPrefix}-day`}>每月第几天</Label>
          <Input
            id={`${idPrefix}-day`}
            type="number"
            min={1}
            max={31}
            className="h-11"
            value={value.dayOfMonth}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, dayOfMonth: Number(e.target.value) })}
          />
        </div>
      ) : null}
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">预览：{preview}</p>
      {showAdvancedCron && onCronChange ? (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-cron-advanced`}>高级 Cron</Label>
          <Input
            id={`${idPrefix}-cron-advanced`}
            className="h-11"
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
