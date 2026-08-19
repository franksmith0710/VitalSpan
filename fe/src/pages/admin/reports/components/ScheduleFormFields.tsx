import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Mail, Plus, Timer } from "lucide-react";
import { cronFromWizard, ScheduleWizard } from "./ScheduleWizard";
import {
  DEFAULT_EMAIL_RECIPIENTS,
  DEFAULT_RECIPIENTS,
  hasValidRecipients,
  ScheduleRecipientsField,
} from "./ScheduleRecipientsField";
import { ScheduleDeliveryHealthAlert } from "./ScheduleDeliveryHealthAlert";
import { ScheduleExportHealthAlert } from "./ScheduleExportHealthAlert";
import { VISUAL_SNAPSHOT_CREATE_NOTICE } from "@/lib/scheduleArtifactMeta";
import { ScheduleFormSection } from "./scheduleDialogUi";
import type { ScheduleRecipient } from "../useReportSchedules";
import type { ScheduleWizardState } from "@/lib/scheduleCronWizard";
import type { EmailSmtpSlot } from "@/lib/emailSmtpSlots";
import { DEFAULT_EMAIL_SMTP_SLOT } from "@/lib/emailSmtpSlots";
import {
  ScheduleDeliveryChannelsField,
  type DeliveryChannel,
} from "./ScheduleDeliveryChannelsField";

export type { DeliveryChannel };
export type AttachmentFormat = "pdf" | "excel";

export type ScheduleFormValue = {
  wizard: ScheduleWizardState;
  cron: string;
  showAdvancedCron: boolean;
  timezone: string;
  recipients: ScheduleRecipient[];
  attachmentFormats: AttachmentFormat[];
  deliveryChannels: DeliveryChannel[];
  notifyGroup: boolean;
  emailSmtpSlot: EmailSmtpSlot;
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
  notifyGroup: false,
  emailSmtpSlot: DEFAULT_EMAIL_SMTP_SLOT,
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
  /** 看板/大屏弹窗内：纵向分区 + 精简 PDF/投递说明 */
  embeddedLayout?: boolean;
  idPrefix?: string;
  /** 标准分析等：仅填写收件邮箱，不展示角色/用户 */
  recipientsMode?: "full" | "email-only";
};

const ATTACHMENT_OPTIONS: { value: AttachmentFormat; label: string; hint: string }[] = [
  { value: "pdf", label: "PDF 可视化快照", hint: "截取画布生成 PDF，推荐" },
  { value: "excel", label: "Excel 布局清单", hint: "组件列表 CSV，非图表渲染" },
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
  recipientsMode = "full",
}: ScheduleFormFieldsProps) {
  const patch = (partial: Partial<ScheduleFormValue>) => onChange({ ...value, ...partial });
  const emailOnlyRecipients = recipientsMode === "email-only";

  const setAttachmentFormat = (format: AttachmentFormat) => {
    patch({ attachmentFormats: [format] });
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
        <p className="text-theme-xs leading-relaxed text-gray-600 dark:text-gray-400">
          按上方调度时间截取当前画布生成 PDF，并以邮件附件发送。
        </p>
      ) : (
        <div className="grid gap-2">
          <Label>附件格式</Label>
          <p className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300">
            PDF 可视化快照
            <span className="mt-0.5 block text-theme-xs text-gray-500">
              {VISUAL_SNAPSHOT_CREATE_NOTICE}
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
    <ScheduleDeliveryChannelsField
      disabled={disabled}
      emailSmtpSlot={value.emailSmtpSlot}
      onEmailSmtpSlotChange={(emailSmtpSlot) => patch({ emailSmtpSlot })}
      embedded={embeddedLayout}
      idPrefix={`${idPrefix}-smtp`}
    />
  ) : null;

  const mergedEmailDelivery =
    embeddedLayout && showDeliveryChannels && emailOnlyRecipients;

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
        <div className="space-y-4">
          <ScheduleFormSection title="调度规则" description="执行频率、时间与 Cron" icon={Timer}>
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
              <div className="grid gap-4 sm:grid-cols-2">
                {timezoneField}
                <div className="flex items-end">{advancedCronButton}</div>
              </div>
            </div>
          </ScheduleFormSection>

          <ScheduleFormSection
            title={mergedEmailDelivery ? "邮件投递" : emailOnlyRecipients ? "收件邮箱" : "接收人"}
            description={
              mergedEmailDelivery
                ? "选择发信通道并填写收件邮箱，定时 PDF 将一次发往所列地址"
                : emailOnlyRecipients
                  ? "填写一个或多个邮箱地址，定时 PDF 将直接发送到这些邮箱"
                  : "按角色、用户或邮箱指定；收件人邮箱在系统管理 → 用户里填写"
            }
            icon={Mail}
            action={
              !disabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    patch({
                      recipients: emailOnlyRecipients
                        ? [...value.recipients.filter((r) => r.type === "email"), { type: "email", value: "" }]
                        : [...value.recipients, ...DEFAULT_RECIPIENTS],
                    })
                  }
                >
                  <Plus className="size-3.5" aria-hidden />
                  {emailOnlyRecipients ? "添加邮箱" : "添加"}
                </Button>
              ) : undefined
            }
            footer={
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
                <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {mergedEmailDelivery
                    ? "同一任务可配置多个收件邮箱；发信通道在平台对接中配置 SMTP 后即可切换。"
                    : emailOnlyRecipients
                      ? "无需绑定平台角色；请确保邮箱地址可正常收信。"
                      : "定时报告将发到收件人在用户资料中填写的邮箱。"}
                </p>
              </div>
            }
          >
            {mergedEmailDelivery ? (
              <div className="space-y-5">
                {deliveryChannelsField}
                <div className="space-y-2 border-t border-gray-100 pt-5 dark:border-gray-800">
                  <Label className="text-theme-sm text-gray-700 dark:text-gray-300">收件邮箱</Label>
                  <ScheduleRecipientsField
                    value={value.recipients}
                    onChange={(recipients) => patch({ recipients })}
                    disabled={disabled}
                    idPrefix={`${idPrefix}-recipient`}
                    embedded
                    hideAddButton
                    mode={recipientsMode}
                  />
                </div>
              </div>
            ) : (
              <ScheduleRecipientsField
                value={value.recipients}
                onChange={(recipients) => patch({ recipients })}
                disabled={disabled}
                idPrefix={`${idPrefix}-recipient`}
                embedded
                hideAddButton
                mode={recipientsMode}
              />
            )}
          </ScheduleFormSection>

          {!mergedEmailDelivery ? deliveryChannelsField : null}

          {showAttachments && attachmentFormatMode === "pdf-only" ? (
            <ScheduleFormSection title="报告附件" description="PDF 可视化快照" icon={FileText}>
              {attachmentField}
            </ScheduleFormSection>
          ) : null}
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
            mode={recipientsMode}
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
