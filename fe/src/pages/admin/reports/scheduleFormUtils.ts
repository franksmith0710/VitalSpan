import { parseCronToWizard } from "@/lib/scheduleCronWizard";
import {
  DEFAULT_SCHEDULE_FORM,
  type ScheduleFormValue,
} from "./components/ScheduleFormFields";
import type { ReportScheduleRow, ScheduleRecipient } from "./useReportSchedules";

export const EMAIL_ONLY_DELIVERY: Pick<ScheduleFormValue, "deliveryChannels" | "notifyGroup"> = {
  deliveryChannels: ["email"],
  notifyGroup: false,
};

export function pickActiveSchedule(items: ReportScheduleRow[]): ReportScheduleRow | null {
  return items.find((item) => item.status !== "cancelled") ?? null;
}

export function scheduleRowToForm(schedule: ReportScheduleRow): ScheduleFormValue {
  return {
    wizard: parseCronToWizard(schedule.cron) ?? DEFAULT_SCHEDULE_FORM.wizard,
    cron: schedule.cron,
    showAdvancedCron: false,
    timezone: schedule.timezone,
    recipients: schedule.recipients?.length
      ? schedule.recipients.map((r) => ({
          type: r.type as ScheduleRecipient["type"],
          value: r.value,
        }))
      : DEFAULT_SCHEDULE_FORM.recipients,
    attachmentFormats: (schedule.attachmentFormats?.length
      ? schedule.attachmentFormats
      : ["pdf"]) as ScheduleFormValue["attachmentFormats"],
    ...EMAIL_ONLY_DELIVERY,
  };
}
