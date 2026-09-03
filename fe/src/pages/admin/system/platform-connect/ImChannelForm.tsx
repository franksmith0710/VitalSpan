import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentGroup } from "@/components/ui/segment-group";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import type { ImConfigSummary } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";
import {
  ConnectActionBar,
  ConnectField,
  ConnectFormSection,
  SOURCE_LABEL,
  channelPickerCardClass,
  channelPickerIconClass,
  IM_CHANNEL_ICON,
} from "./platformConnectUi";

type ImConfig = ImConfigSummary;

type FormState = {
  deliveryMode: "corporate_app" | "user_delegated";
  callbackDomain: string;
  appSecret: string;
  appId: string;
};

function emptyForm(): FormState {
  return {
    deliveryMode: "corporate_app",
    callbackDomain: "",
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
    const defaultMode =
      !config.configured ? "user_delegated" : (config.deliveryMode ?? "corporate_app");
    setForm({
      deliveryMode: defaultMode,
      callbackDomain: config.callbackDomain ?? "",
      appSecret: "",
      appId: config.appId ?? "",
    });
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, string | null> = {
        deliveryMode: form.deliveryMode,
        callbackDomain: form.deliveryMode === "user_delegated" ? null : form.callbackDomain.trim() || null,
        appId: form.appId.trim(),
        appSecret: form.appSecret.trim() || null,
      };
      return apiFetch<ImConfig>(`/api/v1/platform/delivery/im/${config.channel}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (data) => {
      const savedDelegated = data.deliveryMode === "user_delegated";
      toast.success(
        savedDelegated
          ? `${config.label} 用户委托配置已保存`
          : `${config.label} 应用已保存并通过探测`,
      );
      setForm((prev) => ({ ...prev, appSecret: "" }));
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imSlots });
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imChannel(config.channel) });
      await qc.invalidateQueries({ queryKey: ["reports", "schedules", "delivery-health"] });
      onSaved();
      if (!data.configured) {
        toast.warning(
          savedDelegated
            ? "保存成功但 AppId/Secret 不完整，请补全后重试"
            : "保存成功但探测未通过，请检查凭证",
        );
      }
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
  const userDelegated = form.deliveryMode === "user_delegated";
  const userDelegatedSupported = true;

  return (
    <div className="flex flex-col gap-5">
      <Alert severity={config.configured ? "success" : "warning"} appearance="subtle">
        <AlertTitle>{config.configured ? "当前通道可用" : "当前通道未就绪"}</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>来源：{SOURCE_LABEL[config.source] ?? config.source}</p>
          {config.probeError ? <p>{config.probeError}</p> : null}
          {!config.configured ? (
            <p>
              {userDelegated
                ? "用户委托模式仅需 OAuth 客户端凭证；同事扫码绑定后即可由调度 owner 发信。"
                : "保存后将向厂商应用发起 gettoken 探测；通过后同事可在个人中心绑定并接收工作通知。"}
            </p>
          ) : null}
        </AlertDescription>
      </Alert>

      {userDelegatedSupported ? (
        <ConnectFormSection title="投递模式" description="用户委托无需在管理面填写回调域名；同事在个人中心扫码绑定。" icon={Server}>
          <SegmentGroup
            value={form.deliveryMode}
            disabled={disabled || pending}
            sizing="fit"
            onChange={(deliveryMode) => setForm((prev) => ({ ...prev, deliveryMode }))}
            options={[
              { value: "corporate_app", label: "企业应用工作通知" },
              { value: "user_delegated", label: "用户委托（扫码绑定）" },
            ]}
          />
        </ConnectFormSection>
      ) : null}

      {!userDelegated ? (
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
      ) : null}

      <ConnectFormSection title="应用凭证" description="Secret 仅写入不回显；留空表示保留已保存值。" icon={KeyRound}>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </ConnectFormSection>

      <ConnectActionBar
        hint={
          userDelegated
            ? "用户委托模式无需回调域名；保存 AppId/Secret 后同事可在个人中心扫码绑定。"
            : "保存后将立即探测应用凭证；个人中心绑定依赖本配置。"
        }
      >
        <Button type="button" variant="primary" disabled={disabled || pending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending
            ? userDelegated
              ? "保存中…"
              : "保存并探测…"
            : userDelegated
              ? "保存配置"
              : "保存并探测"}
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
  const token = IM_CHANNEL_ICON[config.channel];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={channelPickerCardClass(token, active)}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={channelPickerIconClass(token, active)}>{token.label}</span>
        <p className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">{config.label}</p>
      </div>
      <Badge variant="light" color={config.configured ? "success" : "warning"} size="sm" className="shrink-0">
        {config.configured ? "已就绪" : "未配置"}
      </Badge>
    </button>
  );
}
