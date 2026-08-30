import type { ImChannel } from "@/lib/imChannels";
import type { ScheduleRecipient } from "./useReportSchedules";
import { isValidRecipient } from "./components/ScheduleRecipientsField";
import type { DeliveryChannel, ScheduleFormValue } from "./components/ScheduleFormFields";

export function imChannelsFromDelivery(channels: DeliveryChannel[]): ImChannel[] {
  return channels.filter((ch): ch is ImChannel => ch !== "email");
}

export function hasPlatformRecipients(recipients: ScheduleRecipient[]): boolean {
  return recipients.some(
    (row) => (row.type === "role" || row.type === "user") && row.value.trim().length > 0,
  );
}

export function hasEmailRecipients(recipients: ScheduleRecipient[]): boolean {
  return recipients.some((row) => row.type === "email" && isValidRecipient(row));
}

export function isScheduleFormSubmittable(form: ScheduleFormValue): boolean {
  return getScheduleFormValidation(form).ok;
}

export function getScheduleFormValidation(form: ScheduleFormValue): { ok: boolean; message: string | null } {
  const emailOn = form.deliveryChannels.includes("email");
  const imOn = imChannelsFromDelivery(form.deliveryChannels).length > 0;

  if (!emailOn && !imOn) {
    return { ok: false, message: "请至少选择一种投递方式" };
  }

  const platformOk = hasPlatformRecipients(form.recipients);
  const emailOk = hasEmailRecipients(form.recipients);

  if (imOn && !platformOk) {
    return { ok: false, message: "工作通知须指定平台用户或角色作为接收人" };
  }

  if (emailOn && !emailOk && !platformOk) {
    return { ok: false, message: "请填写至少一个有效邮箱，或选择平台用户/角色" };
  }

  return { ok: true, message: null };
}
