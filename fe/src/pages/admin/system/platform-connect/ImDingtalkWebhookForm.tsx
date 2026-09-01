import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import type { ImConfigSummary } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";
import { ConnectActionBar, ConnectField, ConnectFormSection, SOURCE_LABEL } from "./platformConnectUi";

export function ImDingtalkWebhookForm({
  config,
  disabled,
  onSaved,
}: {
  config: ImConfigSummary;
  disabled: boolean;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    setWebhookUrl("");
  }, [config.channel, config.configured, config.webhookUrl]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImConfigSummary>(`/api/v1/platform/delivery/im/${config.channel}`, {
        method: "PUT",
        body: JSON.stringify({
          deliveryMode: "group_webhook",
          webhookUrl: webhookUrl.trim() || null,
        }),
      }),
    onSuccess: async (data) => {
      toast.success("钉钉群机器人已保存");
      setWebhookUrl("");
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imSlots });
      await qc.invalidateQueries({ queryKey: queryKeys.platformConnect.imChannel(config.channel) });
      await qc.invalidateQueries({ queryKey: ["reports", "schedules", "delivery-health"] });
      onSaved();
      if (!data.configured) {
        toast.warning("保存成功但 webhook 未通过校验，请检查地址");
      }
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImConfigSummary>(`/api/v1/platform/delivery/im/${config.channel}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("钉钉配置已清空");
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
          <span className="block">来源：{SOURCE_LABEL[config.source] ?? config.source}</span>
          {config.probeError ? <span className="block">{config.probeError}</span> : null}
          <span className="block">钉钉按群发：把自定义机器人 webhook 贴到下方即可。不需要企业应用、个人绑定或回调域名。</span>
        </AlertDescription>
      </Alert>

      <ConnectFormSection
        title="群机器人 webhook"
        description="在钉钉群「群设置 → 智能群助手 → 添加机器人 → 自定义」复制 webhook。"
        icon={Link2}
      >
        <ConnectField
          id="im-dingtalk-webhook"
          label={
            <span className="inline-flex items-center gap-2">
              Webhook 地址
              {config.hasSecret && !webhookUrl ? (
                <Badge variant="light" color="success" size="sm">
                  已保存
                </Badge>
              ) : null}
            </span>
          }
          hint="形如 https://oapi.dingtalk.com/robot/send?access_token=…"
        >
          <Input
            id="im-dingtalk-webhook"
            className="h-11"
            type="password"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder={config.hasSecret ? "留空表示不改已保存地址；填新地址则覆盖" : config.webhookUrl ?? "https://oapi.dingtalk.com/robot/send?access_token="}
            disabled={disabled || pending}
          />
        </ConnectField>
      </ConnectFormSection>

      <ConnectActionBar hint="保存后定时勾选钉钉会把摘要和产物链接发到该群，不按人投递。">
        <Button type="button" variant="primary" disabled={disabled || pending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "保存中…" : "保存 webhook"}
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
