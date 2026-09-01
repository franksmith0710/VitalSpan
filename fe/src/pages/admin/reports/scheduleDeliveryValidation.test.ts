import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE_FORM } from "./components/ScheduleFormFields";
import { DEFAULT_EMAIL_RECIPIENTS, DEFAULT_RECIPIENTS } from "./components/ScheduleRecipientsField";
import { getScheduleFormValidation, isScheduleFormSubmittable } from "./scheduleDeliveryValidation";

describe("scheduleDeliveryValidation", () => {
  it("allows DingTalk-only without platform recipients", () => {
    const form = {
      ...DEFAULT_SCHEDULE_FORM,
      deliveryChannels: ["dingtalk"] as const,
      recipients: DEFAULT_EMAIL_RECIPIENTS,
    };
    expect(isScheduleFormSubmittable(form)).toBe(true);
  });

  it("allows IM-only with platform recipients", () => {
    const form = {
      ...DEFAULT_SCHEDULE_FORM,
      deliveryChannels: ["wecom"] as const,
      recipients: DEFAULT_RECIPIENTS,
    };
    expect(isScheduleFormSubmittable(form)).toBe(true);
  });

  it("rejects IM-only without platform recipients", () => {
    const form = {
      ...DEFAULT_SCHEDULE_FORM,
      deliveryChannels: ["feishu"] as const,
      recipients: DEFAULT_EMAIL_RECIPIENTS,
    };
    const validation = getScheduleFormValidation(form);
    expect(validation.ok).toBe(false);
    expect(validation.message).toMatch(/平台用户或角色/);
  });

  it("requires email when email channel selected", () => {
    const form = {
      ...DEFAULT_SCHEDULE_FORM,
      deliveryChannels: ["email"] as const,
      recipients: [{ type: "email" as const, value: "" }],
    };
    expect(isScheduleFormSubmittable(form)).toBe(false);
  });
});
