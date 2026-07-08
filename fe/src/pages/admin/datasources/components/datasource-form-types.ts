export type RestApiAuthMode = "none" | "basic" | "bearer" | "oauth2";

export type RestApiCompanionState = {
  baseUrl: string;
  authMode: RestApiAuthMode;
  username: string;
  password: string;
  healthPath: string;
  connectTimeoutSec: number;
};

export const defaultRestApiCompanion = (): RestApiCompanionState => ({
  baseUrl: "",
  authMode: "none",
  username: "",
  password: "",
  healthPath: "/",
  connectTimeoutSec: 5,
});

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function derivePortFromBaseUrl(baseUrl: string): number {
  const normalized = normalizeBaseUrl(baseUrl);
  try {
    const u = new URL(normalized);
    if (u.port) return Number(u.port);
    return u.protocol === "http:" ? 80 : 443;
  } catch {
    return 443;
  }
}

type BaseFormSlice = {
  name: string;
  code: string;
  type: string;
  description: string;
};

export function buildRestApiPayload(
  form: BaseFormSlice,
  companion: RestApiCompanionState,
  mode: "create" | "edit",
  passwordFromForm: string,
): Record<string, unknown> {
  const host = normalizeBaseUrl(companion.baseUrl);
  const port = derivePortFromBaseUrl(host);
  const rawPath = companion.healthPath.trim() || "/";
  const database = (rawPath.startsWith("/") ? rawPath : `/${rawPath}`).replace(/\/+/g, "/");

  let username = "";
  let password = mode === "create" ? passwordFromForm : passwordFromForm || undefined;

  if (companion.authMode === "basic") {
    username = companion.username;
    password = companion.password;
  } else if (companion.authMode === "bearer") {
    username = "";
    password = companion.password;
  } else if (companion.authMode === "none") {
    username = "none";
    password = mode === "create" ? "-" : passwordFromForm || undefined;
  } else {
    username = "oauth2";
    password = mode === "create" ? "-" : passwordFromForm || undefined;
  }

  const payload: Record<string, unknown> = {
    name: form.name,
    type: form.type,
    host,
    port,
    database,
    username,
    description: form.description || null,
    connectionOptions: { connectTimeoutSec: companion.connectTimeoutSec },
  };
  if (mode === "create") {
    payload.code = form.code;
    payload.password = password;
  } else if (password) {
    payload.password = password;
  }
  return payload;
}
