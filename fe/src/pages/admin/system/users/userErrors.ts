import { mapApiError } from "@/lib/apiError";

const USER_MESSAGES: Record<string, string> = {
  USERNAME_CONFLICT: "用户名已存在",
  USER_NOT_FOUND: "用户不存在",
  BINDING_FORBIDDEN: "无权管理用户角色",
};

export function mapUserError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && USER_MESSAGES[code]) return USER_MESSAGES[code];
  return mapApiError(err);
}
