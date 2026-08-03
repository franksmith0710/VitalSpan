import { describe, expect, it } from "vitest";
import { defaultVizComponentName, defaultVizComponentPayload } from "./vizComponentDefaults";

describe("defaultVizComponentPayload", () => {
  it("creates bar chart payload by default", () => {
    const payload = defaultVizComponentPayload("chart");
    expect(payload.chartConfig?.chartType).toBe("bar");
    expect(payload.chartConfig?.chartId).toBeTruthy();
  });

  it("creates chart payload for selected type", () => {
    const payload = defaultVizComponentPayload("chart", { chartType: "line" });
    expect(payload.chartConfig?.chartType).toBe("line");
  });

  it("creates filter payload with filterId", () => {
    const payload = defaultVizComponentPayload("filter");
    expect(payload.filterConfig?.filterId).toBeTruthy();
  });

  it("names widgets by type", () => {
    expect(defaultVizComponentName("text")).toBe("未命名富文本");
  });
});
