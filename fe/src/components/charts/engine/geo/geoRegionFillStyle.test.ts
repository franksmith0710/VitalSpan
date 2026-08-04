import { describe, expect, it } from "vitest";
import { buildGeoMapStyleContentSig } from "./geoRegionFillStyle";

describe("buildGeoMapStyleContentSig", () => {
  it("includes bubble effect fields so style edits trigger map rebuild", () => {
    const off = buildGeoMapStyleContentSig({});
    const on = buildGeoMapStyleContentSig({
      bubbleEffect: true,
      bubbleEffectSpeed: 2.4,
      bubbleEffectRingCount: 7,
    });
    expect(off).not.toBe(on);
  });

  it("changes when zoom control toggles", () => {
    const off = buildGeoMapStyleContentSig({});
    const on = buildGeoMapStyleContentSig({ showZoomControl: true });
    expect(off).not.toBe(on);
  });
});
