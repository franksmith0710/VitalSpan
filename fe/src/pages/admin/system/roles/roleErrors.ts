import { mapApiError } from "@/lib/apiError";

const ROLE_MESSAGES: Record<string, string> = {
  ROLE_CODE_CONFLICT: "角色编码已存在",
  ROLE_NOT_FOUND: "角色不存在",
  ROLE_IN_USE: "角色仍被用户绑定，无法删除",
  ROLE_FORBIDDEN: "无权管理角色",
};

export function mapRoleError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && ROLE_MESSAGES[code]) return ROLE_MESSAGES[code];
  return mapApiError(err);
}
