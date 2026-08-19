import { describe, expect, it } from "vitest";
import { resolveCustomVizRuntimeStyle } from "./customVizDisplayStyle";

describe("resolveCustomVizRuntimeStyle", () => {
  it("merges manifest default, displayStyle, and schema style", () => {
    const style = resolveCustomVizRuntimeStyle({
      manifestDefault: { accentColor: "#111", barHeight: 12 },
      config: {
        artifactId: "a1",
        displayStyle: {
          title: { show: true, color: "#abc" },
          label: { show: false },
        },
        style: { accentColor: "#222", cornerRadius: 6 },
      },
    });

    expect(style).toEqual({
      accentColor: "#222",
      barHeight: 12,
      titleShow: true,
      titleColor: "#abc",
      labelShow: false,
      cornerRadius: 6,
    });
  });
});
