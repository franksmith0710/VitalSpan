import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { IM_CHANNEL_LABELS, type ImChannel } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";
import {
  embedDingtalkQr,
  type ScanBindStart,
} from "./imScanBind";

type ImBindingItem = {
  channel: ImChannel;
  label: string;
  deliveryMode?: "corporate_app" | "user_delegated" | "group_webhook";
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

type DeviceAuthStart = {
  sessionId: string;
  verificationUri: string;
  userCode: string;
  expiresIn: number;
  interval: number;
};

type DeviceAuthComplete = {
  status: "pending" | "success" | "failed";
  message?: string | null;
  interval?: number | null;
};

const SOURCE_LABEL: Record<string, string> = {
  oauth: "网页授权",
  device: "扫码绑定",
  scan: "扫码绑定",
  admin: "管理员修改",
};

const SCAN_CONTAINER_ID = "im-scan-bind-qr";

export function ImBindingsCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const pollTimer = useRef<number | null>(null);
  const scanContainerId = useId().replace(/:/g, "");
  const [deviceSession, setDeviceSession] = useState<DeviceAuthStart | null>(null);
  const [devicePolling, setDevicePolling] = useState(false);
  const [scanSession, setScanSession] = useState<ScanBindStart | null>(null);
  const [scanChannel, setScanChannel] = useState<ImChannel | null>(null);

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
    setScanSession(null);
    setScanChannel(null);
  }, [qc, searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (pollTimer.current !== null) {
        window.clearTimeout(pollTimer.current);
      }
    };
  }, []);

  const scanCompleteMutation = useMutation({
    mutationFn: (payload: { channel: ImChannel; sessionId: string; authCode: string }) =>
      apiFetch<{ status: string; message?: string }>(
        `/api/v1/me/im-bindings/${payload.channel}/scan-bind/complete`,
        {
          method: "POST",
          body: JSON.stringify({ sessionId: payload.sessionId, authCode: payload.authCode }),
        },
      ),
    onSuccess: async (data, variables) => {
      if (data.status === "success") {
        toast.success(`${IM_CHANNEL_LABELS[variables.channel]} 绑定成功`);
        setScanSession(null);
        setScanChannel(null);
        await qc.invalidateQueries({ queryKey: queryKeys.meImBindings });
      }
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  useEffect(() => {
    if (!scanSession || !scanChannel) return;
    const containerId = `${SCAN_CONTAINER_ID}-${scanContainerId}`;
    let cancelled = false;
    const mount = async () => {
      try {
        if (scanChannel === "dingtalk") {
          await embedDingtalkQr(containerId, scanSession, (authCode) => {
            scanCompleteMutation.mutate({ channel: scanChannel, sessionId: scanSession.sessionId, authCode });
          });
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(mapApiError(err));
        }
      }
    };
    void mount();
    return () => {
      cancelled = true;
    };
  }, [scanSession, scanChannel, scanContainerId, scanCompleteMutation]);

  const unbindMutation = useMutation({
    mutationFn: (channel: ImChannel) =>
      apiFetch<void>(`/api/v1/me/im-bindings/${channel}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("已解绑");
      setDeviceSession(null);
      setScanSession(null);
      setScanChannel(null);
      await qc.invalidateQueries({ queryKey: queryKeys.meImBindings });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const oauthBindMutation = useMutation({
    mutationFn: async (channel: ImChannel) => {
      const redirect = encodeURIComponent("/admin/account/profile");
      return apiFetch<{ authorizeUrl: string }>(
        `/api/v1/me/im-bindings/${channel}/authorize-url?redirectAfter=${redirect}`,
        { method: "POST" },
      );
    },
    onSuccess: (data) => {
      window.location.href = data.authorizeUrl;
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const scanStartMutation = useMutation({
    mutationFn: (channel: ImChannel) => {
      const redirect = encodeURIComponent("/admin/account/profile");
      return apiFetch<ScanBindStart>(
        `/api/v1/me/im-bindings/${channel}/scan-bind/start?redirectAfter=${redirect}`,
        { method: "POST" },
      );
    },
    onSuccess: (data, channel) => {
      setDeviceSession(null);
      setScanChannel(channel);
      setScanSession(data);
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const startOAuthBind = (channel: ImChannel) => {
    oauthBindMutation.mutate(channel);
  };

  const pollDeviceComplete = async (sessionId: string, intervalMs: number) => {
    try {
      const result = await apiFetch<DeviceAuthComplete>("/api/v1/me/im-bindings/feishu/device-auth/complete", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
      if (result.status === "success") {
        setDevicePolling(false);
        setDeviceSession(null);
        toast.success("飞书绑定成功");
        await qc.invalidateQueries({ queryKey: queryKeys.meImBindings });
        return;
      }
      pollTimer.current = window.setTimeout(
        () => void pollDeviceComplete(sessionId, intervalMs),
        Math.max(intervalMs, 3) * 1000,
      );
    } catch (err) {
      setDevicePolling(false);
      toast.error(mapApiError(err));
    }
  };

  const deviceStartMutation = useMutation({
    mutationFn: () =>
      apiFetch<DeviceAuthStart>("/api/v1/me/im-bindings/feishu/device-auth/start", { method: "POST" }),
    onSuccess: (data) => {
      setScanSession(null);
      setScanChannel(null);
      setDeviceSession(data);
      setDevicePolling(true);
      void pollDeviceComplete(data.sessionId, data.interval);
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const startBind = (item: ImBindingItem) => {
    if (item.channel === "feishu" && item.deliveryMode === "user_delegated") {
      deviceStartMutation.mutate();
      return;
    }
    if (item.deliveryMode === "user_delegated" && item.channel === "dingtalk") {
      scanStartMutation.mutate(item.channel);
      return;
    }
    startOAuthBind(item.channel);
  };

  const bindPending =
    deviceStartMutation.isPending ||
    oauthBindMutation.isPending ||
    scanStartMutation.isPending ||
    scanCompleteMutation.isPending;

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
            绑定后定时报告可发到您的飞书个人账号。钉钉为群发，无需在此绑定。
          </p>
        </div>
      </div>

      {deviceSession ? (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="text-theme-sm font-medium text-gray-900 dark:text-white">飞书扫码授权</p>
          <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-300">
            请在浏览器打开下方链接并输入验证码 <span className="font-mono font-semibold">{deviceSession.userCode}</span>
          </p>
          <a
            href={deviceSession.verificationUri}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-theme-sm text-brand-600 hover:underline"
          >
            打开飞书授权页
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <p className="mt-2 text-theme-xs text-gray-500">
            {devicePolling ? "等待授权中…" : "授权轮询已停止，可重新点击绑定"}
          </p>
        </div>
      ) : null}

      {scanSession && scanChannel ? (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="text-theme-sm font-medium text-gray-900 dark:text-white">
            {IM_CHANNEL_LABELS[scanChannel]} 扫码绑定
          </p>
          <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-300">
            请使用钉钉扫描下方二维码完成授权。
          </p>
          <div
            id={`${SCAN_CONTAINER_ID}-${scanContainerId}`}
            className="mt-3 flex min-h-[280px] items-center justify-center"
          />
        </div>
      ) : null}

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
                  ) : item.deliveryMode === "group_webhook" && item.appConfigured ? (
                    <Badge variant="light" color="success" size="sm">
                      群发已就绪
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
                  {item.deliveryMode === "group_webhook"
                    ? item.appConfigured
                      ? "钉钉按群发，无需个人绑定"
                      : item.probeError || "请管理员在平台对接中粘贴群机器人 webhook"
                    : item.bound
                    ? `账号 ${item.maskedAccount ?? "—"}${item.source ? ` · ${SOURCE_LABEL[item.source] ?? item.source}` : ""}`
                    : item.appConfigured
                      ? item.deliveryMode === "user_delegated"
                        ? "点击绑定后将展示扫码区域"
                        : "点击绑定后将在厂商页面确认身份"
                      : item.probeError || "请管理员在平台对接中配置并探测通过"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {item.deliveryMode === "group_webhook" ? null : item.bound ? (
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
                    disabled={!item.appConfigured || bindPending}
                    onClick={() => startBind(item)}
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
