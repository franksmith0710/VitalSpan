import { clearAuthToken, getAuthToken } from "@/lib/auth-token";

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiRequestError extends Error {
  code?: string;
  fields?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    code?: string,
    fields?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.fields = fields;
  }
}

export type ApiEnvelope<T> = {
  code?: number | string;
  message?: string;
  data?: T;
} & T;

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "" : "http://localhost:8000");

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(init.headers ?? {}),
    },
  });
  if (response.status === 401) {
    clearAuthToken();
    onUnauthorized?.();
    throw new ApiRequestError("登录已过期，请重新登录", "UNAUTHORIZED");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      detail?: { fields?: Array<{ field: string; message: string }> };
    };
    throw new ApiRequestError(
      body.message ?? "操作失败，请稍后重试",
      body.code,
      body.detail?.fields,
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
