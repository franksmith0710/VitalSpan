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
import { FileText, Mail, Timer, Users } from "lucide-react";
import { cronFromWizard, ScheduleWizard } from "./ScheduleWizard";
import {
  DEFAULT_RECIPIENTS,
  hasValidRecipients,
  ScheduleRecipientsField,
} from "./ScheduleRecipientsField";
import { ScheduleDeliveryHealthAlert } from "./ScheduleDeliveryHealthAlert";
import { ScheduleExportHealthAlert } from "./ScheduleExportHealthAlert";
import { ScheduleFormSection } from "./scheduleDialogUi";
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
  /** 看板/大屏弹窗内：双栏布局 + 精简 PDF/投递说明 */
  embeddedLayout?: boolean;
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
  embeddedLayout = false,
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

  const timezoneField = (
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
  );

  const attachmentField =
    showAttachments && attachmentFormatMode === "pdf-only" ? (
      embeddedLayout ? (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.03]">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-gray-200 dark:bg-white/5 dark:text-brand-400 dark:ring-gray-700">
            <FileText className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">PDF 可视化快照</p>
            <p className="mt-0.5 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              截取当前画布生成报告，经邮件投递附件。
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label>附件格式</Label>
          <p className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300">
            PDF 可视化快照
            <span className="mt-0.5 block text-theme-xs text-gray-500">
              截取画布生成 PDF；看板/大屏定时报告主路径仅支持 PDF。
            </span>
          </p>
        </div>
      )
    ) : showAttachments ? (
      <div className="grid gap-2">
        <Label>附件格式</Label>
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
      </div>
    ) : null;

  const deliveryChannelsField = showDeliveryChannels ? (
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
  ) : null;

  const advancedCronButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={() => patch({ showAdvancedCron: !value.showAdvancedCron })}
    >
      {value.showAdvancedCron ? "隐藏高级 Cron" : "高级 Cron"}
    </Button>
  );

  return (
    <div className={embeddedLayout ? "space-y-5" : "space-y-4"}>
      {!disabled && !hideStandaloneHealthAlerts ? (
        <>
          <ScheduleDeliveryHealthAlert />
          <ScheduleExportHealthAlert />
        </>
      ) : null}
      {embeddedLayout ? (
        <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
          <div className="grid gap-4 lg:col-span-3">
            <ScheduleFormSection
              title="调度规则"
              description="设置执行频率、时间与附件格式"
              icon={Timer}
            >
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
                  idPrefix={idPrefix}
                  embedded
                />
                {timezoneField}
                {attachmentField}
                {advancedCronButton}
              </div>
            </ScheduleFormSection>
          </div>
          <div className="grid gap-4 lg:col-span-2">
            <ScheduleFormSection
              title="接收人"
              description="按角色、用户或邮箱指定投递对象"
              icon={Users}
            >
              <ScheduleRecipientsField
                value={value.recipients}
                onChange={(recipients) => patch({ recipients })}
                disabled={disabled}
                idPrefix={`${idPrefix}-recipient`}
                embedded
              />
            </ScheduleFormSection>
            <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <Mail className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
              <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                看板/大屏主路径经邮件投递 PDF；企微与钉钉仅发送摘要引用。
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
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
            {timezoneField}
            {attachmentField}
          </div>
          {deliveryChannelsField}
          {advancedCronButton}
        </>
      )}
    </div>
  );
}

export function isScheduleFormSubmittable(form: ScheduleFormValue): boolean {
  return hasValidRecipients(form.recipients);
}
