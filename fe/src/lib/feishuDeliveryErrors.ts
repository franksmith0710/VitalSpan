/** 飞书投递失败且用户可在浏览器补授权（对标 Lark 插件 missing_scope 流程）。 */
export const FEISHU_REAUTH_PROFILE_PATH = "/admin/account/profile?feishuReauth=1";

export function isFeishuPermissionError(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (/飞书.*(权限|授权|补充)/.test(text)) return true;
  const lower = text.toLowerCase();
  if (/unauthorized/.test(lower) && /(contact:user|employee_id|im:|privileges)/.test(lower)) {
    return true;
  }
  if (/privileges:\s*\[/.test(lower) && /im:/.test(lower)) return true;
  return false;
}

export function rowNeedsFeishuReauth(
  errorMessage?: string | null,
  deliverySteps?: { channel?: string; error?: string }[],
): boolean {
  if (errorMessage && isFeishuPermissionError(errorMessage)) return true;
  return (deliverySteps ?? []).some(
    (step) => step.channel === "feishu" && step.error && isFeishuPermissionError(step.error),
  );
}
