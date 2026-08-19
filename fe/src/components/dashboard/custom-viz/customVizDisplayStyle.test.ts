import { describe, expect, it } from "vitest";
import {
  resolveCustomVizRuntimeStyle,
  stripCustomVizDisplayStyleOverrides,
} from "./customVizDisplayStyle";

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

describe("stripCustomVizDisplayStyleOverrides", () => {
  it("clears background, palette, and color overrides while keeping structure fields", () => {
    const next = stripCustomVizDisplayStyleOverrides({
      background: { background: "#ff0000", padding: 8 },
      paletteId: "warm",
      paletteColors: ["#111111"],
      title: { fontSize: 16, color: "#abc" },
      label: { position: "outside", color: "#def" },
      tooltip: { fontSize: 12, color: "#000", background: "#fff" },
      border: { width: 2, color: "#999" },
    });

    expect(next).toEqual({
      title: { fontSize: 16 },
      label: { position: "outside" },
      tooltip: { fontSize: 12 },
      border: { width: 2 },
    });
  });
});
