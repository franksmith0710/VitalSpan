import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type DeliveryChannel = "email" | "wecom" | "dingtalk" | "feishu";

const CHANNEL_OPTIONS: { value: DeliveryChannel; label: string }[] = [
  { value: "email", label: "邮件" },
  { value: "wecom", label: "企业微信" },
  { value: "dingtalk", label: "钉钉" },
  { value: "feishu", label: "飞书" },
];

type Props = {
  deliveryChannels: DeliveryChannel[];
  notifyGroup: boolean;
  disabled?: boolean;
  onChannelsChange: (next: DeliveryChannel[]) => void;
  onNotifyGroupChange: (next: boolean) => void;
};

export function ScheduleDeliveryChannelsField({
  deliveryChannels,
  notifyGroup,
  disabled,
  onChannelsChange,
  onNotifyGroupChange,
}: Props) {
  const toggleChannel = (channel: DeliveryChannel, checked: boolean) => {
    const next = checked
      ? [...new Set([...deliveryChannels, channel])]
      : deliveryChannels.filter((c) => c !== channel);
    onChannelsChange(next.length ? next : ["email"]);
  };

  return (
    <div className="grid gap-2">
      <Label>投递方式</Label>
      <div className="flex min-h-11 flex-wrap items-center gap-4">
        {CHANNEL_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-theme-sm">
            <Checkbox
              checked={deliveryChannels.includes(opt.value)}
              disabled={disabled}
              onCheckedChange={(c) => toggleChannel(opt.value, c === true)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-theme-sm">
        <Checkbox
          checked={notifyGroup}
          disabled={disabled}
          onCheckedChange={(c) => onNotifyGroupChange(c === true)}
        />
        同时发到群
      </label>
      <p className="text-theme-xs text-gray-500">
        邮件发给收件人邮箱；钉钉/企微/飞书发给该用户在资料里绑的账号。未绑号不会改发到群。勾选「同时发到群」才会再发群机器人。
      </p>
    </div>
  );
}
