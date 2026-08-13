import { Mail } from "lucide-react";
import { Label } from "@/components/ui/label";

export type DeliveryChannel = "email" | "wecom" | "dingtalk" | "feishu";

type Props = {
  disabled?: boolean;
};

export function ScheduleDeliveryChannelsField({ disabled: _disabled }: Props) {
  return (
    <div className="grid gap-2">
      <Label>投递方式</Label>
      <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
        <Mail className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
        <p className="text-theme-sm text-gray-700 dark:text-gray-300">
          将发到收件人邮箱
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            请确保收件人在系统管理 → 用户资料中填写了有效邮箱。发信 SMTP 由管理员在 backend/.env 配置（如 QQ 邮箱），本页不提供登录。
          </span>
        </p>
      </div>
    </div>
  );
}
