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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const body: unknown = await response.json();
    if (!isRecord(body)) return null;
    const detail = isRecord(body.detail) ? body.detail : null;
    return {
      message: typeof body.message === "string" ? body.message : undefined,
      code: typeof body.code === "string" ? body.code : undefined,
      fields: Array.isArray(detail?.fields)
        ? (detail.fields as Array<{ field: string; message: string }>)
        : undefined,
    };
  } catch {
    return null;
  }
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
  const response = await fetch(`${API_BASE}${path}`, {
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
    clearAuthToken();
    onUnauthorized?.();
    throw new ApiRequestError("登录已过期，请重新登录", "UNAUTHORIZED");
  }
  if (!response.ok) {
    throw toApiRequestError(await parseErrorBody(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
