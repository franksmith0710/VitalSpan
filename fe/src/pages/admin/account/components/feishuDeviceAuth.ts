import { apiFetch } from "@/lib/api";

export type DeviceAuthStart = {
  sessionId: string;
  verificationUri: string;
  userCode: string;
  expiresIn: number;
  interval: number;
};

export type DeviceAuthComplete = {
  status: "pending" | "success" | "needs_reauth" | "needs_admin" | "failed";
  message?: string | null;
  interval?: number | null;
  needsReauth?: boolean;
  missingScopes?: string[];
  suggestedScope?: string | null;
  needsAdmin?: boolean;
  adminPortalUrl?: string | null;
};

export type FeishuCapability = {
  ready: boolean;
  message: string;
  needsReauth?: boolean;
  missingScopes?: string[];
  suggestedScope?: string | null;
  needsAdmin?: boolean;
  adminPortalUrl?: string | null;
};

export function openPendingAuthTab(): Window | null {
  const popup = window.open("about:blank", "_blank");
  if (popup) {
    popup.opener = null;
  }
  return popup;
}

export function navigateAuthTab(popup: Window | null, uri: string): boolean {
  const target = uri.trim();
  if (!target) return false;
  if (popup && !popup.closed) {
    popup.location.replace(target);
    return true;
  }
  const opened = window.open(target, "_blank");
  if (opened) {
    opened.opener = null;
    return true;
  }
  return false;
}

export async function startFeishuDeviceAuth(scope?: string | null): Promise<DeviceAuthStart> {
  return apiFetch<DeviceAuthStart>("/api/v1/me/im-bindings/feishu/device-auth/start", {
    method: "POST",
    body: JSON.stringify(scope?.trim() ? { scope: scope.trim() } : {}),
  });
}

export async function completeFeishuDeviceAuth(sessionId: string): Promise<DeviceAuthComplete> {
  return apiFetch<DeviceAuthComplete>("/api/v1/me/im-bindings/feishu/device-auth/complete", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function fetchFeishuCapability(): Promise<FeishuCapability> {
  return apiFetch<FeishuCapability>("/api/v1/me/im-bindings/feishu/capability");
}

export function openAdminPortal(url?: string | null): void {
  if (!url?.trim()) return;
  window.open(url.trim(), "_blank", "noopener");
}
