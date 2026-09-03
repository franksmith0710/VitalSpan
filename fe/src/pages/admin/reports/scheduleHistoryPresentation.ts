import { localizeApiMessage } from "@/lib/apiError";
import { isFeishuPermissionError } from "@/lib/feishuDeliveryErrors";

/** 列表/卡片用短摘要；SMTP 原文留给详情弹窗。 */
export function executionErrorHeadline(message: string): string {
  const text = localizeApiMessage(message).trim();
  if (isFeishuPermissionError(message) || isFeishuPermissionError(text)) {
    return "飞书权限不足，请补充授权后重试";
  }
  if (/550|non-existent|recipient may contain/i.test(text)) {
    return "邮件投递失败，请核对收件地址";
  }
  const headline = text.split(/[（(]/)[0]?.replace(/[：:]\s*$/, "").trim();
  return headline || text;
}
