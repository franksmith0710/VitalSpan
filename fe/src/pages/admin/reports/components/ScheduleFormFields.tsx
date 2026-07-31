import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cronFromWizard, ScheduleWizard } from "./ScheduleWizard";
import {
  DEFAULT_RECIPIENTS,
  hasValidRecipients,
  ScheduleRecipientsField,
} from "./ScheduleRecipientsField";
import type { ScheduleRecipient } from "../useReportSchedules";
import type { ScheduleWizardState } from "@/lib/scheduleCronWizard";

export type ScheduleFormValue = {
  wizard: ScheduleWizardState;
  cron: string;
  showAdvancedCron: boolean;
  timezone: string;
  recipients: ScheduleRecipient[];
  attachmentFormats: ("pdf" | "excel")[];
};

export const DEFAULT_SCHEDULE_FORM: ScheduleFormValue = {
  wizard: {
    frequency: "daily",
    hour: 8,
    minute: 0,
    weekday: 1,
    dayOfMonth: 1,
  },
  cron: "0 8 * * *",
  showAdvancedCron: false,
  timezone: "Asia/Shanghai",
  recipients: DEFAULT_RECIPIENTS,
  attachmentFormats: ["pdf"],
};

export function resolveScheduleCron(form: ScheduleFormValue): string {
  return form.showAdvancedCron ? form.cron : cronFromWizard(form.wizard);
}

type ScheduleFormFieldsProps = {
  value: ScheduleFormValue;
  onChange: (next: ScheduleFormValue) => void;
  disabled?: boolean;
  showAttachments?: boolean;
  idPrefix?: string;
};

export function ScheduleFormFields({
  value,
  onChange,
  disabled,
  showAttachments = false,
  idPrefix = "schedule-form",
}: ScheduleFormFieldsProps) {
  const patch = (partial: Partial<ScheduleFormValue>) => onChange({ ...value, ...partial });

  const toggleFormat = (format: "pdf" | "excel", checked: boolean) => {
    const next = checked
      ? [...new Set([...value.attachmentFormats, format])]
      : value.attachmentFormats.filter((f) => f !== format);
    patch({ attachmentFormats: next.length ? next : ["pdf"] });
  };

  return (
    <div className="space-y-4">
      <ScheduleWizard
        value={value.wizard}
        onChange={(wizard) => {
          patch({ wizard, cron: cronFromWizard(wizard) });
        }}
        disabled={disabled}
        showAdvancedCron={value.showAdvancedCron}
        cron={value.cron}
        onCronChange={(cron) => patch({ cron })}
      />
      <ScheduleRecipientsField
        value={value.recipients}
        onChange={(recipients) => patch({ recipients })}
        disabled={disabled}
        idPrefix={`${idPrefix}-recipient`}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-tz`}>时区</Label>
          <Select
            value={value.timezone}
            onValueChange={(timezone) => patch({ timezone })}
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-tz`} className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showAttachments ? (
          <div className="grid gap-2">
            <Label>附件格式</Label>
            <div className="flex min-h-11 flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-theme-sm">
                <Checkbox
                  checked={value.attachmentFormats.includes("pdf")}
                  disabled={disabled}
                  onCheckedChange={(c) => toggleFormat("pdf", c === true)}
                />
                PDF
              </label>
              <label className="flex items-center gap-2 text-theme-sm">
                <Checkbox
                  checked={value.attachmentFormats.includes("excel")}
                  disabled={disabled}
                  onCheckedChange={(c) => toggleFormat("excel", c === true)}
                />
                Excel
              </label>
            </div>
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => patch({ showAdvancedCron: !value.showAdvancedCron })}
      >
        {value.showAdvancedCron ? "隐藏高级 Cron" : "高级 Cron"}
      </Button>
    </div>
  );
}

export function isScheduleFormSubmittable(form: ScheduleFormValue): boolean {
  return hasValidRecipients(form.recipients);
}
