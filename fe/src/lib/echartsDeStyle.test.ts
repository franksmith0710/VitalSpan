import { describe, expect, it } from "vitest";
import { applyDeStyleToEchartsOption } from "./echartsDeStyle";

describe("applyDeStyleToEchartsOption", () => {
  it("adds dataZoom slider when enabled", () => {
    const option = applyDeStyleToEchartsOption({ series: [] }, {}, true);
    expect(option.dataZoom).toHaveLength(2);
  });

  it("hides legend when show is false", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [], legend: { show: true } },
      { legend: { show: false } },
      false,
    );
    expect((option.legend as { show?: boolean }).show).toBe(false);
  });
});
