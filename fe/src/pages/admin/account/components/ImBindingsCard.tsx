import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { IM_CHANNEL_LABELS, type ImChannel } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";

type ImBindingItem = {
  channel: ImChannel;
  label: string;
  appConfigured: boolean;
  bound: boolean;
  maskedAccount?: string | null;
  source?: string | null;
  deliverable: boolean;
  probeError?: string | null;
};

type ImBindingsResponse = {
  items: ImBindingItem[];
};

const SOURCE_LABEL: Record<string, string> = {
  oauth: "自助绑定",
  admin: "管理员修改",
};

export function ImBindingsCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const bindingsQuery = useQuery({
    queryKey: queryKeys.meImBindings,
    queryFn: () => apiFetch<ImBindingsResponse>("/api/v1/me/im-bindings"),
  });

  useEffect(() => {
    const status = searchParams.get("status");
    const channel = searchParams.get("imBind");
    if (!status || !channel) return;
    if (status === "success") {
      toast.success(`${IM_CHANNEL_LABELS[channel as ImChannel] ?? channel} 绑定成功`);
    } else if (status === "error") {
      toast.error("绑定失败，请重试或联系管理员");
    }
    searchParams.delete("status");
    searchParams.delete("imBind");
    searchParams.delete("message");
    setSearchParams(searchParams, { replace: true });
    void qc.invalidateQueries({ queryKey: queryKeys.meImBindings });
  }, [qc, searchParams, setSearchParams]);

  const unbindMutation = useMutation({
    mutationFn: (channel: ImChannel) =>
      apiFetch<void>(`/api/v1/me/im-bindings/${channel}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("已解绑");
      await qc.invalidateQueries({ queryKey: queryKeys.meImBindings });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const startBind = (channel: ImChannel) => {
    const redirect = encodeURIComponent("/admin/account/profile");
    window.location.href = `/api/v1/me/im-bindings/${channel}/authorize?redirectAfter=${redirect}`;
  };

  const items = bindingsQuery.data?.items ?? [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02] md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <MessageSquare className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white">工作通知绑定</h2>
          <p className="mt-0.5 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            绑定后定时报告可发到您的企微 / 钉钉 / 飞书个人账号（须管理员先完成平台对接）。
          </p>
        </div>
      </div>

      {bindingsQuery.isLoading ? (
        <p className="text-theme-sm text-gray-500">加载中…</p>
      ) : bindingsQuery.isError ? (
        <p className="text-theme-sm text-error-600">无法加载绑定状态</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.channel}
              className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-theme-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                  {item.bound ? (
                    <Badge variant="light" color="success" size="sm">
                      已绑定
                    </Badge>
                  ) : item.appConfigured ? (
                    <Badge variant="light" color="warning" size="sm">
                      未绑定
                    </Badge>
                  ) : (
                    <Badge variant="light" color="light" size="sm">
                      应用未配置
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  {item.bound
                    ? `账号 ${item.maskedAccount ?? "—"}${item.source ? ` · ${SOURCE_LABEL[item.source] ?? item.source}` : ""}`
                    : item.appConfigured
                      ? "点击绑定后将在厂商页面确认身份"
                      : item.probeError || "请管理员在平台对接中配置并探测通过"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {item.bound ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={unbindMutation.isPending}
                    onClick={() => unbindMutation.mutate(item.channel)}
                  >
                    解绑
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!item.appConfigured}
                    onClick={() => startBind(item.channel)}
                  >
                    绑定{item.label}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
