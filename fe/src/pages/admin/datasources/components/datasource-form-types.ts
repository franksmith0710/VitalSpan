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

export type FileSourceMode = "remote" | "local";

export type FileSourceCompanionState = {
  mode: FileSourceMode;
  remoteUrl: string;
  serverPath: string;
  sheetName: string;
  selectedFileName: string;
  fileError: string | null;
};

export const defaultFileSourceCompanion = (): FileSourceCompanionState => ({
  mode: "remote",
  remoteUrl: "",
  serverPath: "",
  sheetName: "",
  selectedFileName: "",
  fileError: null,
});

const FILE_PLACEHOLDER_USER = "file";
const FILE_PLACEHOLDER_PASS = "-";

export function buildFileSourcePayload(
  form: BaseFormSlice,
  companion: FileSourceCompanionState,
  mode: "create" | "edit",
  passwordFromForm: string,
): Record<string, unknown> {
  const host =
    companion.mode === "remote"
      ? companion.remoteUrl.trim()
      : companion.serverPath.trim();

  const payload: Record<string, unknown> = {
    name: form.name,
    type: form.type,
    host,
    port: 1,
    database: companion.sheetName || "",
    username: FILE_PLACEHOLDER_USER,
    description: form.description || null,
  };
  if (mode === "create") {
    payload.code = form.code;
    payload.password = FILE_PLACEHOLDER_PASS;
  } else if (passwordFromForm) {
    payload.password = passwordFromForm;
  }
  return payload;
}

export function validateFileExtension(filename: string, sourceType: "excel" | "csv"): string | null {
  const lower = filename.toLowerCase();
  if (sourceType === "excel") {
    return lower.endsWith(".xlsx") || lower.endsWith(".xls") ? null : "仅支持 .xlsx 或 .xls 文件";
  }
  return lower.endsWith(".csv") ? null : "仅支持 .csv 文件";
}

export const FILE_SIZE_WARN_BYTES = 50 * 1024 * 1024;
