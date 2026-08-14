import { Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMAIL_SMTP_SLOTS,
  type EmailSmtpSlot,
} from "@/lib/emailSmtpSlots";

export type DeliveryChannel = "email" | "wecom" | "dingtalk" | "feishu";

type Props = {
  disabled?: boolean;
  emailSmtpSlot: EmailSmtpSlot;
  onEmailSmtpSlotChange: (slot: EmailSmtpSlot) => void;
};

export function ScheduleDeliveryChannelsField({
  disabled,
  emailSmtpSlot,
  onEmailSmtpSlotChange,
}: Props) {
  return (
    <div className="grid gap-2">
      <Label>投递方式</Label>
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="flex items-start gap-2.5">
          <Mail className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
          <p className="text-theme-sm text-gray-700 dark:text-gray-300">
            将发到收件人邮箱
            <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
              请确保收件人在系统管理 → 用户资料中填写了有效邮箱。
            </span>
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="schedule-email-smtp-slot" className="text-theme-xs text-gray-500">
            发信通道
          </Label>
          <Select
            value={emailSmtpSlot}
            onValueChange={(value) => onEmailSmtpSlotChange(value as EmailSmtpSlot)}
            disabled={disabled}
          >
            <SelectTrigger id="schedule-email-smtp-slot" className="h-10 bg-white dark:bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_SMTP_SLOTS.map((item) => (
                <SelectItem key={item.slot} value={item.slot}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            使用系统管理 → 平台对接中对应槽位的 SMTP 发信。
          </p>
        </div>
      </div>
    </div>
  );
}
