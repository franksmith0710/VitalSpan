type DeliveryStep = {
  channel?: string;
  status?: string;
  mode?: string;
  error?: string;
  recipients?: string[];
  to?: string[];
  recipientUsernames?: string[];
  recipient_usernames?: string[];
};

function stepRecipientNames(step: DeliveryStep): string[] {
  return step.recipientUsernames ?? step.recipient_usernames ?? [];
}

export function formatDeliveryStepLines(
  steps?: DeliveryStep[],
): { title: string; detail: string }[] {
  if (!steps?.length) return [];
  return steps.map((step) => {
    const channel = step.channel ?? "unknown";
    const status = step.status ?? "unknown";
    if (channel === "feishu") {
      const names = stepRecipientNames(step).length
        ? stepRecipientNames(step).join("、")
        : step.to?.length
          ? `飞书 ${step.to.length} 人`
          : "飞书收件人";
      if (status === "delivered") {
        return {
          title: "飞书",
          detail:
            step.mode === "user_delegated"
              ? `已发往 ${names}（以您的身份发送）。请在飞书 App「消息」中搜索「VitalSpan 定时报告」查看文字与 PDF；自发自收通常无系统推送。也可在本页点击下载 PDF。`
              : `已发往 ${names}。请在飞书 App「消息」中查看通知与附件。`,
        };
      }
      return {
        title: "飞书",
        detail: step.error ?? `投递状态：${status}`,
      };
    }
    if (channel === "email") {
      const emails = step.recipients?.join("、") ?? "—";
      return {
        title: "邮件",
        detail: status === "delivered" ? `已发送至 ${emails}` : step.error ?? `状态：${status}`,
      };
    }
    return {
      title: channel,
      detail: step.error ?? `状态：${status}`,
    };
  });
}

export function rowHasDeliveryDetail(steps?: DeliveryStep[]): boolean {
  return Boolean(steps?.length);
}
