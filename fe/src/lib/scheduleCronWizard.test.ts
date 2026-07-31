import { describe, expect, it } from "vitest";
import { cronFromWizard, describeCron, parseCronToWizard } from "./scheduleCronWizard";

describe("scheduleCronWizard", () => {
  it("builds daily cron", () => {
    expect(
      cronFromWizard({ frequency: "daily", hour: 8, minute: 0, weekday: 1, dayOfMonth: 1 }),
    ).toBe("0 8 * * *");
    expect(describeCron("0 8 * * *")).toBe("每天 08:00");
  });

  it("builds weekly cron", () => {
    expect(
      cronFromWizard({ frequency: "weekly", hour: 8, minute: 0, weekday: 1, dayOfMonth: 1 }),
    ).toBe("0 8 * * 1");
    expect(describeCron("0 8 * * 1")).toBe("每周一 08:00");
  });

  it("builds monthly cron", () => {
    expect(
      cronFromWizard({ frequency: "monthly", hour: 9, minute: 30, weekday: 1, dayOfMonth: 15 }),
    ).toBe("30 9 15 * *");
    expect(describeCron("30 9 15 * *")).toBe("每月 15 日 09:30");
  });

  it("round-trips wizard presets", () => {
    const wizard = parseCronToWizard("0 8 * * 1");
    expect(wizard?.frequency).toBe("weekly");
    expect(cronFromWizard(wizard!)).toBe("0 8 * * 1");
  });
});
