import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import type { ImChannel, ImConfigSummary } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";
import {
  ConnectActionBar,
  ConnectField,
  ConnectFormSection,
  SOURCE_LABEL,
} from "./platformConnectUi";

type ImConfig = ImConfigSummary;

type FormState = {
  callbackDomain: string;
  corpId: string;
  secret: string;
  agentId: string;
  appKey: string;
  appSecret: string;
  appId: string;
};

function emptyForm(): FormState {
  return {
    callbackDomain: "",
    corpId: "",
    secret: "",
    agentId: "",
    appKey: "",
    appSecret: "",
    appId: "",
  };
}

export function ImChannelForm({
  config,
  disabled,
  onSaved,
}: {
  config: ImConfig;
  disabled: boolean;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    setForm({
      callbackDomain: config.callbackDomain ?? "",
      corpId: config.corpId ?? "",
      secret: "",
      agentId: config.agentId ?? "",
      appKey: config.appKey ?? "",
      appSecret: "",
      appId: config.appId ?? "",
    });
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, string | null> = {
        callbackDomain: form.callbackDomain.trim(),
      };
      if (config.channel === "wecom") {
        body.corpId = form.corpId.trim();
        body.agentId = form.agentId.trim();
        body.secret = form.secret.trim() || null;
      } else if (config.channel === "dingtalk") {
        body.appKey = form.appKey.trim();
        body.agentId = form.agentId.trim();
        body.appSecret = form.appSecret.trim() || null;
      } else {
        body.appId = form.appId.trim();
        body.appSecret = form.appSecret.trim() || null;
      }
      return apiFetch<ImConfig>(`/api/v1/platform/delivery/im/${config.channel}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (data) => {
      toast.success(`${config.label} 应用已保存并通过探测`);
      setForm((prev) => ({ ...prev, secret: "", appSecret: "" }));
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imSlots });
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imChannel(config.channel) });
      await qc.invalidateQueries({ queryKey: ["reports", "schedules", "delivery-health"] });
      onSaved();
      if (!data.configured) toast.warning("保存成功但探测未通过，请检查凭证");
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImConfig>(`/api/v1/platform/delivery/im/${config.channel}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success(`${config.label} 配置已清空`);
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imSlots });
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imChannel(config.channel) });
      await qc.invalidateQueries({ queryKey: ["reports", "schedules", "delivery-health"] });
      onSaved();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const pending = saveMutation.isPending || clearMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
      <Alert severity={config.configured ? "success" : "warning"} appearance="subtle">
        <AlertTitle>{config.configured ? "当前通道可用" : "当前通道未就绪"}</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>来源：{SOURCE_LABEL[config.source] ?? config.source}</p>
          {config.probeError ? <p>{config.probeError}</p> : null}
          {!config.configured ? (
            <p>保存后将向厂商应用发起 gettoken 探测；通过后同事可在个人中心绑定并接收工作通知。</p>
          ) : null}
        </AlertDescription>
      </Alert>

      <ConnectFormSection
        title="回调域名"
        description="须与开放平台登记的重定向域名一致，用于 OAuth 绑定回跳。"
        icon={Server}
      >
        <ConnectField id={`im-callback-${config.channel}`} label="回调域名" hint="例如 vitalspan.example.com（不含路径）">
          <Input
            id={`im-callback-${config.channel}`}
            className="h-11"
            value={form.callbackDomain}
            onChange={(e) => setForm((prev) => ({ ...prev, callbackDomain: e.target.value }))}
            placeholder="your-domain.example.com"
          />
        </ConnectField>
      </ConnectFormSection>

      <ConnectFormSection title="应用凭证" description="Secret 仅写入不回显；留空表示保留已保存值。" icon={KeyRound}>
        <div className="grid gap-4 sm:grid-cols-2">
          {config.channel === "wecom" ? (
            <>
              <ConnectField id={`im-corp-${config.channel}`} label="CorpId">
                <Input
                  id={`im-corp-${config.channel}`}
                  className="h-11"
                  value={form.corpId}
                  onChange={(e) => setForm((prev) => ({ ...prev, corpId: e.target.value }))}
                />
              </ConnectField>
              <ConnectField id={`im-agent-${config.channel}`} label="AgentId">
                <Input
                  id={`im-agent-${config.channel}`}
                  className="h-11"
                  value={form.agentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, agentId: e.target.value }))}
                />
              </ConnectField>
              <ConnectField
                id={`im-secret-${config.channel}`}
                label={
                  <span className="inline-flex items-center gap-2">
                    Secret
                    {config.hasSecret && !form.secret ? (
                      <Badge variant="light" color="success" size="sm">
                        已加密保存
                      </Badge>
                    ) : null}
                  </span>
                }
                className="sm:col-span-2"
              >
                <Input
                  id={`im-secret-${config.channel}`}
                  className="h-11"
                  type="password"
                  value={form.secret}
                  onChange={(e) => setForm((prev) => ({ ...prev, secret: e.target.value }))}
                  placeholder={config.hasSecret ? "留空保留已保存 Secret" : "应用 Secret"}
                />
              </ConnectField>
            </>
          ) : null}
          {config.channel === "dingtalk" ? (
            <>
              <ConnectField id={`im-appkey-${config.channel}`} label="AppKey">
                <Input
                  id={`im-appkey-${config.channel}`}
                  className="h-11"
                  value={form.appKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, appKey: e.target.value }))}
                />
              </ConnectField>
              <ConnectField id={`im-agent-${config.channel}`} label="AgentId">
                <Input
                  id={`im-agent-${config.channel}`}
                  className="h-11"
                  value={form.agentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, agentId: e.target.value }))}
                />
              </ConnectField>
              <ConnectField
                id={`im-appsecret-${config.channel}`}
                label="AppSecret"
                className="sm:col-span-2"
              >
                <Input
                  id={`im-appsecret-${config.channel}`}
                  className="h-11"
                  type="password"
                  value={form.appSecret}
                  onChange={(e) => setForm((prev) => ({ ...prev, appSecret: e.target.value }))}
                  placeholder={config.hasSecret ? "留空保留已保存 AppSecret" : "应用 AppSecret"}
                />
              </ConnectField>
            </>
          ) : null}
          {config.channel === "feishu" ? (
            <>
              <ConnectField id={`im-appid-${config.channel}`} label="AppId">
                <Input
                  id={`im-appid-${config.channel}`}
                  className="h-11"
                  value={form.appId}
                  onChange={(e) => setForm((prev) => ({ ...prev, appId: e.target.value }))}
                />
              </ConnectField>
              <ConnectField id={`im-appsecret-${config.channel}`} label="AppSecret" className="sm:col-span-2">
                <Input
                  id={`im-appsecret-${config.channel}`}
                  className="h-11"
                  type="password"
                  value={form.appSecret}
                  onChange={(e) => setForm((prev) => ({ ...prev, appSecret: e.target.value }))}
                  placeholder={config.hasSecret ? "留空保留已保存 AppSecret" : "应用 AppSecret"}
                />
              </ConnectField>
            </>
          ) : null}
        </div>
      </ConnectFormSection>

      <ConnectActionBar hint="保存后将立即探测应用凭证；个人中心绑定依赖本配置。">
        <Button type="button" variant="primary" disabled={disabled || pending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "保存并探测…" : "保存并探测"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pending || config.source !== "db"}
          onClick={() => clearMutation.mutate()}
        >
          清空配置
        </Button>
      </ConnectActionBar>
    </div>
  );
}

export function ImChannelPickerCard({
  config,
  active,
  onSelect,
}: {
  config: ImConfig;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-brand-300 bg-brand-50/50 shadow-theme-sm ring-1 ring-brand-500/15 dark:border-brand-500/35 dark:bg-brand-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-theme-sm font-semibold text-gray-900 dark:text-white">{config.label}</p>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">工作通知 · 按人投递</p>
        </div>
        <Badge variant="light" color={config.configured ? "success" : "warning"} size="sm">
          {config.configured ? "已就绪" : "未配置"}
        </Badge>
      </div>
      <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {config.configured
          ? `${SOURCE_LABEL[config.source] ?? config.source}`
          : "配置后用户可在个人中心授权绑定"}
      </p>
    </button>
  );
}
