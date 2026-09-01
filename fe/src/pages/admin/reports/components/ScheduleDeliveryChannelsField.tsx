import { MessageSquare } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IM_CHANNEL_LABELS, type ImChannel } from "@/lib/imChannels";
import {
  EMAIL_SMTP_SLOTS,
  type EmailSmtpSlot,
} from "@/lib/emailSmtpSlots";

export type DeliveryChannel = "email" | ImChannel;

const IM_OPTIONS: ImChannel[] = ["dingtalk", "feishu"];

type Props = {
  disabled?: boolean;
  deliveryChannels: DeliveryChannel[];
  onDeliveryChannelsChange: (channels: DeliveryChannel[]) => void;
  emailSmtpSlot: EmailSmtpSlot;
  onEmailSmtpSlotChange: (slot: EmailSmtpSlot) => void;
  embedded?: boolean;
  idPrefix?: string;
};

export function ScheduleDeliveryChannelsField({
  disabled,
  deliveryChannels,
  onDeliveryChannelsChange,
  emailSmtpSlot,
  onEmailSmtpSlotChange,
  embedded = false,
  idPrefix = "schedule-email-smtp",
}: Props) {
  const emailSelected = deliveryChannels.includes("email");
  const imSelected = deliveryChannels.filter((ch): ch is ImChannel => ch !== "email");

  const toggleEmail = () => {
    if (emailSelected) {
      onDeliveryChannelsChange(imSelected);
      return;
    }
    onDeliveryChannelsChange(["email", ...imSelected]);
  };

  const toggleIm = (channel: ImChannel) => {
    if (imSelected.includes(channel)) {
      const next = imSelected.filter((item) => item !== channel);
      onDeliveryChannelsChange(emailSelected ? ["email", ...next] : next);
      return;
    }
    const next = [...imSelected, channel];
    onDeliveryChannelsChange(emailSelected ? ["email", ...next] : next);
  };

  const slotField = emailSelected ? (
    <div className="grid gap-1.5">
      <Label htmlFor={`${idPrefix}-slot`} className={embedded ? undefined : "text-theme-xs text-gray-500"}>
        发信通道
      </Label>
      <Select
        value={emailSmtpSlot}
        onValueChange={(value) => onEmailSmtpSlotChange(value as EmailSmtpSlot)}
        disabled={disabled}
      >
        <SelectTrigger
          id={`${idPrefix}-slot`}
          className={embedded ? "h-11 bg-white dark:bg-transparent" : "h-10 bg-white dark:bg-transparent"}
        >
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
  ) : null;

  const channelToggles = (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-2 text-theme-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={emailSelected}
          disabled={disabled}
          aria-label="邮件"
          onChange={toggleEmail}
        />
        <span>
          邮件
          <span className="mt-0.5 block text-theme-xs text-gray-500">发到收件人邮箱</span>
        </span>
      </label>
      {IM_OPTIONS.map((channel) => (
        <label key={channel} className="flex cursor-pointer items-start gap-2 text-theme-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={imSelected.includes(channel)}
            disabled={disabled}
            aria-label={IM_CHANNEL_LABELS[channel]}
            onChange={() => toggleIm(channel)}
          />
          <span>
            {IM_CHANNEL_LABELS[channel]}
            <span className="mt-0.5 block text-theme-xs text-gray-500">
              {channel === "dingtalk" ? "发到钉钉群（自定义机器人）" : "按人投递工作通知（须已绑定）"}
            </span>
          </span>
        </label>
      ))}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {channelToggles}
        {slotField}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label>投递方式</Label>
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="flex items-start gap-2.5">
          <MessageSquare className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
          <p className="text-theme-sm text-gray-700 dark:text-gray-300">
            可同时选择邮件与 IM 通道；飞书按人投递不会改发到群；钉钉发到已配置的群机器人。
          </p>
        </div>
        {channelToggles}
        {slotField}
      </div>
    </div>
  );
}
