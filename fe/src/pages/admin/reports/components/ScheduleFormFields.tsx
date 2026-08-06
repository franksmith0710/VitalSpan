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
import { ScheduleDeliveryHealthAlert } from "./ScheduleDeliveryHealthAlert";
import { ScheduleExportHealthAlert } from "./ScheduleExportHealthAlert";
import type { ScheduleRecipient } from "../useReportSchedules";
import type { ScheduleWizardState } from "@/lib/scheduleCronWizard";

export type DeliveryChannel = "email" | "wecom" | "dingtalk";
export type AttachmentFormat = "pdf" | "excel";

export type ScheduleFormValue = {
  wizard: ScheduleWizardState;
  cron: string;
  showAdvancedCron: boolean;
  timezone: string;
  recipients: ScheduleRecipient[];
  attachmentFormats: AttachmentFormat[];
  deliveryChannels: DeliveryChannel[];
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
  deliveryChannels: ["email"],
};

export function resolveScheduleCron(form: ScheduleFormValue): string {
  return form.showAdvancedCron ? form.cron : cronFromWizard(form.wizard);
}

type ScheduleFormFieldsProps = {
  value: ScheduleFormValue;
  onChange: (next: ScheduleFormValue) => void;
  disabled?: boolean;
  showAttachments?: boolean;
  /** dashboard/data-screen main path: fixed visual PDF, no Excel inventory */
  attachmentFormatMode?: "select" | "pdf-only";
  showDeliveryChannels?: boolean;
  /** 与 SchedulePrecheckPanel 同屏时隐藏独立健康 Alert，避免重复 */
  hideStandaloneHealthAlerts?: boolean;
  idPrefix?: string;
};

const ATTACHMENT_OPTIONS: { value: AttachmentFormat; label: string; hint: string }[] = [
  { value: "pdf", label: "PDF 可视化快照", hint: "截取画布生成 PDF，推荐" },
  { value: "excel", label: "Excel 布局清单", hint: "组件列表 CSV，非图表渲染" },
];

const CHANNEL_OPTIONS: { value: DeliveryChannel; label: string }[] = [
  { value: "email", label: "邮件" },
  { value: "wecom", label: "企业微信" },
  { value: "dingtalk", label: "钉钉" },
];

export function ScheduleFormFields({
  value,
  onChange,
  disabled,
  showAttachments = false,
  attachmentFormatMode = "select",
  showDeliveryChannels = false,
  hideStandaloneHealthAlerts = false,
  idPrefix = "schedule-form",
}: ScheduleFormFieldsProps) {
  const patch = (partial: Partial<ScheduleFormValue>) => onChange({ ...value, ...partial });

  const setAttachmentFormat = (format: AttachmentFormat) => {
    patch({ attachmentFormats: [format] });
  };

  const toggleChannel = (channel: DeliveryChannel, checked: boolean) => {
    const next = checked
      ? [...new Set([...value.deliveryChannels, channel])]
      : value.deliveryChannels.filter((c) => c !== channel);
    patch({ deliveryChannels: next.length ? next : ["email"] });
  };

  return (
    <div className="space-y-4">
      {!disabled && !hideStandaloneHealthAlerts ? (
        <>
          <ScheduleDeliveryHealthAlert />
          <ScheduleExportHealthAlert />
        </>
      ) : null}
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
              <SelectItem value="Asia/Shanghai">中国标准时间 (UTC+8)</SelectItem>
              <SelectItem value="UTC">协调世界时 (UTC)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showAttachments ? (
          <div className="grid gap-2">
            <Label>附件格式</Label>
            {attachmentFormatMode === "pdf-only" ? (
              <p className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300">
                PDF 可视化快照
                <span className="mt-0.5 block text-theme-xs text-gray-500">
                  截取画布生成 PDF；看板/大屏定时报告主路径仅支持 PDF。
                </span>
              </p>
            ) : (
              <div className="space-y-2">
                {ATTACHMENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-theme-sm">
                    <input
                      type="radio"
                      name={`${idPrefix}-format`}
                      checked={value.attachmentFormats[0] === opt.value}
                      disabled={disabled}
                      onChange={() => setAttachmentFormat(opt.value)}
                      className="mt-1"
                    />
                    <span>
                      {opt.label}
                      <span className="block text-theme-xs text-gray-500">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
      {showDeliveryChannels ? (
        <div className="grid gap-2">
          <Label>投递方式</Label>
          <div className="flex min-h-11 flex-wrap items-center gap-4">
            {CHANNEL_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-theme-sm">
                <Checkbox
                  checked={value.deliveryChannels.includes(opt.value)}
                  disabled={disabled}
                  onCheckedChange={(c) => toggleChannel(opt.value, c === true)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="text-theme-xs text-gray-500">
            企微/钉钉发送摘要与下载引用；PDF 附件经邮件投递。
          </p>
        </div>
      ) : null}
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
