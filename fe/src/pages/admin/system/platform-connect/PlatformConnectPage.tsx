import { useQuery } from "@tanstack/react-query";
import { Info, Link2 } from "lucide-react";
import { useState } from "react";
import {
  AdminPageHeaderIcon,
  AdminPageShell,
} from "@/components/layout/admin-page-shell";
import { ListPageSection } from "@/components/layout/list-page-kit";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { DEFAULT_EMAIL_SMTP_SLOT, type EmailSmtpSlot } from "@/lib/emailSmtpSlots";
import type { ImChannel, ImConfigSummary } from "@/lib/imChannels";
import { IM_CHANNELS } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";
import { EmailSmtpSlotForm } from "./EmailSmtpSlotForm";
import { ImChannelForm, ImChannelPickerCard } from "./ImChannelForm";
import { ImDingtalkWebhookForm } from "./ImDingtalkWebhookForm";
import { ChannelPickerCard } from "./platformConnectUi";
import { SystemAdminScopeHint } from "../SystemAdminScopeHint";

type EmailConfig = {
  slot: EmailSmtpSlot;
  label: string;
  configured: boolean;
  source: "db" | "env" | "none";
  host?: string | null;
  port?: number | null;
  from?: string | null;
  username?: string | null;
  hasPassword: boolean;
  probeStatus?: string | null;
  probeError?: string | null;
};

type EmailSlotsResponse = { items: EmailConfig[] };
type ImSlotsResponse = { items: ImConfigSummary[] };

type ActiveTarget =
  | { type: "email"; slot: EmailSmtpSlot }
  | { type: "im"; channel: ImChannel };

export function PlatformConnectPage() {
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>({
    type: "email",
    slot: DEFAULT_EMAIL_SMTP_SLOT,
  });
  const configQuery = useQuery({
    queryKey: queryKeys.platformConnect.emailSlots,
    queryFn: () => apiFetch<EmailSlotsResponse>("/api/v1/platform/delivery/email/slots"),
  });
  const imQuery = useQuery({
    queryKey: queryKeys.platformConnect.imSlots,
    queryFn: () => apiFetch<ImSlotsResponse>("/api/v1/platform/delivery/im/slots"),
  });

  const items = configQuery.data?.items ?? [];
  const imItems =
    imQuery.data?.items ??
    IM_CHANNELS.map(
      (channel) =>
        ({
          channel,
          label: channel,
          configured: false,
          source: "none",
          hasSecret: false,
        }) satisfies ImConfigSummary,
    );
  const activeEmailConfig = items.find((item) => item.slot === activeTarget.slot && activeTarget.type === "email");
  const activeImConfig = imItems.find(
    (item) => item.channel === activeTarget.channel && activeTarget.type === "im",
  );
  const pending = configQuery.isLoading || imQuery.isLoading;

  return (
    <AdminPageShell
      title="平台对接"
      description="配置邮件 SMTP 与企微 / 钉钉 / 飞书工作通知应用。用户可在个人中心绑定后接收定时报告。"
      headerIcon={
        <AdminPageHeaderIcon>
          <Link2 className="size-5" aria-hidden />
        </AdminPageHeaderIcon>
      }
    >
      {configQuery.isError || imQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(configQuery.error ?? imQuery.error)}
          onRetry={() => {
            void configQuery.refetch();
            void imQuery.refetch();
          }}
        />
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-1">
        <SystemAdminScopeHint scope="platform-connect" />
      </div>

      <ListPageSection className="mx-auto w-full max-w-6xl">
        {pending ? (
          <div className="space-y-5 p-5 md:p-6">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="px-5 py-5 md:px-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-theme-xs dark:bg-brand-500/10 dark:text-brand-400">
                  <Link2 className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white">投递通道</h2>
                  <p className="mt-0.5 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    邮件 SMTP 与 IM 工作通知并列配置；定时任务创建时可勾选对应通道。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {items.map((config) => (
                  <ChannelPickerCard
                    key={config.slot}
                    config={config}
                    active={activeTarget.type === "email" && activeTarget.slot === config.slot}
                    onSelect={() => setActiveTarget({ type: "email", slot: config.slot })}
                  />
                ))}
                {imItems.map((config) => (
                  <ImChannelPickerCard
                    key={config.channel}
                    config={config}
                    active={activeTarget.type === "im" && activeTarget.channel === config.channel}
                    onSelect={() => setActiveTarget({ type: "im", channel: config.channel })}
                  />
                ))}
              </div>

              <div className="mt-5">
                {activeTarget.type === "email" && activeEmailConfig ? (
                  <EmailSmtpSlotForm
                    key={activeEmailConfig.slot}
                    config={activeEmailConfig}
                    disabled={pending}
                    onSaved={() => void configQuery.refetch()}
                  />
                ) : null}
                {activeTarget.type === "im" && activeImConfig ? (
                  activeImConfig.channel === "dingtalk" ? (
                    <ImDingtalkWebhookForm
                      key={activeImConfig.channel}
                      config={activeImConfig}
                      disabled={pending}
                      onSaved={() => void imQuery.refetch()}
                    />
                  ) : (
                    <ImChannelForm
                      key={activeImConfig.channel}
                      config={activeImConfig}
                      disabled={pending}
                      onSaved={() => void imQuery.refetch()}
                    />
                  )
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-2.5 border-t border-gray-100 px-5 py-4 dark:border-white/[0.06] md:px-6">
              <Info className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
              <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                IM 账号由用户在个人中心自助绑定（企微/飞书）；钉钉走群机器人，无需个人绑定。清空某通道后即使环境变量仍有旧值，该通道也不会再发信。
              </p>
            </div>
          </div>
        )}
      </ListPageSection>
    </AdminPageShell>
  );
}
