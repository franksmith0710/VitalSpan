const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiRequestError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
  }
}

export type ApiEnvelope<T> = {
  code?: number | string;
  message?: string;
  data?: T;
} & T;

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer dev",
      ...(init.headers ?? {}),
    },
  });
  if (response.status === 401) {
    throw new Error("请使用开发令牌登录");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiRequestError(body.message ?? "操作失败，请稍后重试", body.code);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
