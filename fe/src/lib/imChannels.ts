export const IM_CHANNELS = ["wecom", "dingtalk", "feishu"] as const;

export type ImChannel = (typeof IM_CHANNELS)[number];

export const IM_CHANNEL_LABELS: Record<ImChannel, string> = {
  wecom: "企业微信",
  dingtalk: "钉钉",
  feishu: "飞书",
};

export type ImConfigSummary = {
  channel: ImChannel;
  label: string;
  configured: boolean;
  source: "db" | "env" | "none";
  deliveryMode?: "corporate_app" | "user_delegated" | "group_webhook";
  callbackDomain?: string | null;
  corpId?: string | null;
  agentId?: string | null;
  appKey?: string | null;
  appId?: string | null;
  webhookUrl?: string | null;
  hasSecret: boolean;
  probeError?: string | null;
};
