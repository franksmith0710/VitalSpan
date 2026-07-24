import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyGeo3dSceneFog,
  buildGeo3dStyleContentSig,
  geo3dPresetDefaults,
  hasCustomGeo3dShellColor,
  resolveGeo3dSceneFog,
  resolveGeo3dShellColorHex,
  resolveGeo3dStylePreset,
  resolveGeo3dVisualStyle,
  resolvePresetRegionBorderDefaults,
} from "./geo3dVisualStyle";

describe("geo3dVisualStyle", () => {
  it("defaults to satellite preset", () => {
    expect(resolveGeo3dStylePreset({})).toBe("satellite");
  });

  it("tech preset enables fog and prefers terrain", () => {
    const defaults = geo3dPresetDefaults("tech");
    expect(defaults.terrainTexture).toBe(true);
    expect(defaults.sceneFog).toBe(true);

    const visual = resolveGeo3dVisualStyle({ stylePreset: "tech" }, true);
    expect(visual.preset).toBe("tech");
    expect(visual.sceneFog).toBe(true);
    expect(visual.techSatelliteOverlay).toBe(true);
  });

  it("classic preset turns off terrain by default", () => {
    const defaults = geo3dPresetDefaults("classic");
    expect(defaults.terrainTexture).toBe(false);
    const visual = resolveGeo3dVisualStyle({ stylePreset: "classic" }, false);
    expect(visual.preferTerrainTexture).toBe(false);
  });

  it("scene fog resolves from preset when unset", () => {
    expect(resolveGeo3dSceneFog({ stylePreset: "tech" })).toBe(true);
    expect(resolveGeo3dSceneFog({ stylePreset: "satellite" })).toBe(false);
    expect(resolveGeo3dSceneFog({ stylePreset: "tech", sceneFog: false })).toBe(false);
  });

  it("applyGeo3dSceneFog uses camera-relative distances", () => {
    const scene = new THREE.Scene();
    const visual = resolveGeo3dVisualStyle({ stylePreset: "tech" }, true);
    applyGeo3dSceneFog(scene, { defaultDistance: 20 }, visual, true);
    expect(scene.fog).toBeInstanceOf(THREE.Fog);
    const fog = scene.fog as THREE.Fog;
    expect(fog.near).toBeCloseTo(8.4);
    expect(fog.far).toBeCloseTo(27.6);
  });

  it("preset region border defaults differ by preset", () => {
    const tech = resolvePresetRegionBorderDefaults(true, "tech");
    const minimal = resolvePresetRegionBorderDefaults(true, "minimal");
    expect(tech.hex).not.toBe(minimal.hex);
  });

  it("content sig includes shell and border fields", () => {
    const a = buildGeo3dStyleContentSig({ stylePreset: "satellite" }, { showRegionBorder: true });
    const b = buildGeo3dStyleContentSig(
      { stylePreset: "satellite", shellColor: "#112233" },
      { showRegionBorder: true, regionBorderColor: "#aabbcc" },
    );
    expect(a).not.toBe(b);
  });

  it("resolves custom shell color hex", () => {
    expect(resolveGeo3dShellColorHex({ shellColor: "#AABBCC" }, true)).toBe("#aabbcc");
    expect(hasCustomGeo3dShellColor({ shellColor: "#112233" })).toBe(true);
    expect(hasCustomGeo3dShellColor({})).toBe(false);
  });
});
