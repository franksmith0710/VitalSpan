import { clearAuthToken, getAuthToken } from "@/lib/auth-token";

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): () => void {
  onUnauthorized = handler;
  return () => {
    if (onUnauthorized === handler) {
      onUnauthorized = null;
    }
  };
}

export function resetUnauthorizedHandler(): void {
  onUnauthorized = null;
}

export function getEmbedTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

export function isEmbedShareContext(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.location.pathname.startsWith("/embed/")) return false;
  return Boolean(getEmbedTokenFromLocation());
}

export function getAuthHeaders(): Record<string, string> {
  const embedToken = getEmbedTokenFromLocation();
  if (embedToken) return { "X-Embed-Token": embedToken };
  const token = getAuthToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export function resolveQueryExecutePath(): string {
  return getEmbedTokenFromLocation()
    ? "/api/v1/embed/query/execute"
    : "/api/v1/query/execute";
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

export interface ApiFetchOptions extends RequestInit {
  preserveSessionOn401Codes?: readonly string[];
}

type ApiErrorBody = {
  message?: string;
  code?: string;
  fields?: Array<{ field: string; message: string }>;
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "" : "http://localhost:8000");

export const API_FETCH_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = API_FETCH_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiRequestError(
        "请求超时，请确认后端服务（uvicorn）与数据库已启动",
        "REQUEST_TIMEOUT",
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody | null> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) return null;

  let body: unknown;
  try {
    body = JSON.parse(trimmed) as unknown;
  } catch {
    if (/internal server error/i.test(trimmed)) {
      return {
        message: "后端服务内部错误，请重启 uvicorn 并查看终端日志",
        code: "INTERNAL_SERVER_ERROR",
      };
    }
    return { message: trimmed.slice(0, 200), code: "HTTP_ERROR" };
  }

  if (!isRecord(body)) return null;

  if (Array.isArray(body.detail)) {
    const fields = body.detail
      .map((item) => {
        if (!isRecord(item)) return null;
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((part) => typeof part === "string").join(".")
          : "";
        const message = typeof item.msg === "string" ? item.msg : "";
        if (!message) return null;
        return { field: loc || "detail", message };
      })
      .filter((item): item is { field: string; message: string } => item !== null);
    const first = fields[0];
    return {
      message: first ? `${first.field}: ${first.message}` : undefined,
      code: typeof body.code === "string" ? body.code : "VALIDATION_ERROR",
      fields: fields.length > 0 ? fields : undefined,
    };
  }

  const detail = isRecord(body.detail) ? body.detail : null;
  const detailMessage =
    typeof body.detail === "string" && body.detail.trim() ? body.detail.trim() : undefined;
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : detailMessage;
  return {
    message,
    code:
      typeof body.code === "string"
        ? body.code
        : message
          ? "HTTP_ERROR"
          : undefined,
    fields: Array.isArray(detail?.fields)
      ? (detail.fields as Array<{ field: string; message: string }>)
      : undefined,
  };
}

function toApiRequestError(body: ApiErrorBody | null): ApiRequestError {
  return new ApiRequestError(
    body?.message ?? "操作失败，请稍后重试",
    body?.code,
    body?.fields,
  );
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<T> {
  const { preserveSessionOn401Codes, ...fetchInit } = init;
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(fetchInit.headers ?? {}),
    },
  });
  if (response.status === 401) {
    const body = await parseErrorBody(response);
    const preservesSession =
      body?.message !== undefined &&
      body.code !== undefined &&
      preserveSessionOn401Codes?.includes(body.code);
    if (preservesSession) {
      throw toApiRequestError(body);
    }
    if (!isEmbedShareContext()) {
      clearAuthToken();
      onUnauthorized?.();
    }
    throw new ApiRequestError(
      isEmbedShareContext() ? (body?.message ?? "嵌入令牌无效或已过期") : "登录已过期，请重新登录",
      isEmbedShareContext() ? body?.code ?? "EMBED_UNAUTHORIZED" : "UNAUTHORIZED",
    );
  }
  if (!response.ok) {
    throw toApiRequestError(await parseErrorBody(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
