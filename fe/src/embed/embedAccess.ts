import { isOriginAllowed } from "./EmbedSharePanel";

/** 浏览器直开 embed 页（非 iframe 嵌套） */
export function isTopLevelEmbedView(): boolean {
  try {
    return window.self === window.top;
  } catch {
    return true;
  }
}

export function resolveEmbedAllowedOrigins(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get("allowedOrigins");
  if (raw) return raw.split(",").filter(Boolean);
  return [window.location.origin];
}

/**
 * 前端 embed 来源门禁：公开链 / 直开带 token / iframe 白名单。
 * 后端仍校验 token 与 origin。
 */
export function isEmbedPageAuthorized(
  searchParams: URLSearchParams,
  parentOrigin: string,
  hasToken: boolean,
): boolean {
  if (searchParams.get("shareMode") === "public") return true;
  if (hasToken && isTopLevelEmbedView()) return true;
  return isOriginAllowed(parentOrigin, resolveEmbedAllowedOrigins(searchParams));
}
