import { describe, expect, it } from "vitest";
import {
  buildPointEffectsContentSig,
  resolveGeo3dPointEffects,
  resolvePointEffectsStyle,
} from "@/components/charts/engine/three/geo3dPointEffectsStyle";

describe("geo3dPointEffectsStyle", () => {
  it("tech preset enables point effects by default", () => {
    expect(resolveGeo3dPointEffects({ stylePreset: "tech" })).toBe(true);
    expect(resolveGeo3dPointEffects({ stylePreset: "satellite" })).toBe(false);
  });

  it("respects per-layer toggles", () => {
    const resolved = resolvePointEffectsStyle(
      { stylePreset: "tech", heatBlob: false, pointPillar: true, floatingLabels: false },
      "tech",
      true,
      true,
    );
    expect(resolved.layers.heatBlob).toBe(false);
    expect(resolved.layers.pointPillar).toBe(true);
    expect(resolved.layers.floatingLabels).toBe(false);
  });

  it("builds stable content signature", () => {
    const sig = buildPointEffectsContentSig({ stylePreset: "tech", pointPillarRingSpeed: 2 }, true);
    expect(sig).toContain("2");
  });
});
