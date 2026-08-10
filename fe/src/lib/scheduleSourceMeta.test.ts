import { describe, expect, it } from "vitest";
import {
  filterSchedulesByTab,
  localizeSourceType,
  scheduleSourceHref,
  scheduleTabForSourceType,
  summarizeRecipients,
} from "@/lib/scheduleSourceMeta";

describe("scheduleSourceMeta", () => {
  it("localizes source types", () => {
    expect(localizeSourceType("template")).toBe("模板");
    expect(localizeSourceType("dashboard")).toBe("看板");
    expect(localizeSourceType("data_screen")).toBe("大屏");
  });

  it("builds correct href for data_screen", () => {
    expect(
      scheduleSourceHref({
        sourceType: "data_screen",
        sourceId: "ds-1",
        catalogNodeId: null,
      }),
    ).toBe("/admin/data-screens/ds-1/share");
  });

  it("summarizes recipients", () => {
    expect(
      summarizeRecipients([
        { type: "role", value: "admin" },
        { type: "email", value: "a@b.com" },
      ]),
    ).toContain("管理员");
  });

  it("filters schedules by tab", () => {
    const items = [
      { sourceType: "template" },
      { sourceType: "dashboard" },
      { sourceType: "data_screen" },
    ];
    expect(filterSchedulesByTab(items, "dashboard")).toHaveLength(2);
    expect(filterSchedulesByTab(items, "template")).toHaveLength(1);
  });

  it("resolves tab for schedule source type", () => {
    expect(scheduleTabForSourceType("dashboard")).toBe("dashboard");
    expect(scheduleTabForSourceType("data_screen")).toBe("dashboard");
    expect(scheduleTabForSourceType("template")).toBe("template");
    expect(scheduleTabForSourceType(undefined)).toBe("template");
  });
});
