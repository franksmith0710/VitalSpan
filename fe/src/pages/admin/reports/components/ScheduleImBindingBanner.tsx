import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MessageSquare } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { IM_CHANNEL_LABELS, type ImChannel } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";

type ImBindingItem = {
  channel: ImChannel;
  label: string;
  deliveryMode?: "corporate_app" | "user_delegated" | "group_webhook";
  appConfigured: boolean;
  bound: boolean;
  deliverable: boolean;
  probeError?: string | null;
};

type ImBindingsResponse = {
  items: ImBindingItem[];
};

type Props = {
  channels: ImChannel[];
  className?: string;
};

export function ScheduleImBindingBanner({ channels, className }: Props) {
  const bindingsQuery = useQuery({
    queryKey: queryKeys.meImBindings,
    queryFn: () => apiFetch<ImBindingsResponse>("/api/v1/me/im-bindings"),
    staleTime: 30_000,
  });

  if (channels.length === 0) return null;

  const items = (bindingsQuery.data?.items ?? []).filter((item) => channels.includes(item.channel));

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.02] ${className ?? ""}`}
    >
      <div className="mb-3 flex items-start gap-2">
        <MessageSquare className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
        <div className="min-w-0">
          <p className="text-theme-sm font-medium text-gray-900 dark:text-white">IM 绑定与发信身份</p>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            飞书收件人须在个人中心绑定；飞书用户委托模式下，<strong className="font-medium">您（调度创建人）</strong>
            也需绑定。钉钉发到群机器人，无需个人绑定。
          </p>
        </div>
      </div>

      {bindingsQuery.isLoading ? (
        <p className="text-theme-xs text-gray-500">加载绑定状态…</p>
      ) : bindingsQuery.isError ? (
        <p className="text-theme-xs text-error-600">无法加载绑定状态，请稍后重试</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const groupWebhook = item.deliveryMode === "group_webhook";
            const ownerNeedsBind =
              item.channel === "feishu" && item.deliveryMode === "user_delegated" && !item.bound;
            const recipientHint = !item.appConfigured
              ? item.probeError || "管理员尚未在平台对接中配置"
              : groupWebhook
                ? "钉钉按群发，无需个人绑定"
                : ownerNeedsBind
                ? "您尚未绑定，无法以您的身份发信"
                : item.bound
                  ? "您已绑定，可作为发信身份"
                  : "建议先完成绑定，便于确认通道可用";
            return (
              <li
                key={item.channel}
                className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-white/[0.06] dark:bg-transparent sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {item.label}
                    </span>
                    {item.appConfigured ? (
                      <Badge variant="light" color="success" size="sm">
                        应用已配置
                      </Badge>
                    ) : (
                      <Badge variant="light" color="light" size="sm">
                        应用未配置
                      </Badge>
                    )}
                    {groupWebhook ? (
                      <Badge variant="light" color="success" size="sm">
                        群发
                      </Badge>
                    ) : item.bound ? (
                      <Badge variant="light" color="success" size="sm">
                        我已绑定
                      </Badge>
                    ) : (
                      <Badge variant="light" color="warning" size="sm">
                        我未绑定
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{recipientHint}</p>
                </div>
                {!groupWebhook ? (
                  <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
                    <Link to="/admin/account/profile">
                      去绑定
                      <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
        平台对接：
        <Link to="/admin/system/platform-connect" className="ml-1 text-brand-600 hover:underline dark:text-brand-400">
          系统管理 → 平台对接
        </Link>
        {channels.map((ch) => IM_CHANNEL_LABELS[ch]).join("、")} 应用由管理员配置。
      </p>
    </div>
  );
}
