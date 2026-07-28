import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  GEO3D_PLATFORM_GROUP_NAME,
  buildGeo3dPlatformEffects,
} from "./geo3dPlatformEffects";
import {
  resolvePlatformEffectsStyle,
  resolvePlatformLayerFlags,
} from "./geo3dPlatformStyle";
import {
  applyGeo3dPlatformEffectsLayer,
  resolveGeo3dPlatformEffects,
  resolveGeo3dVisualStyle,
} from "./geo3dVisualStyle";

describe("geo3dPlatformEffects", () => {
  const layout = { halfX: 9, halfZ: 6, minY: -0.5 };

  it("builds five platform decoration layers by default", () => {
    const resolved = resolvePlatformEffectsStyle({ stylePreset: "tech" }, "tech", true, true);
    const handle = buildGeo3dPlatformEffects(layout, resolved);
    expect(handle.group.name).toBe(GEO3D_PLATFORM_GROUP_NAME);
    expect(handle.group.children).toHaveLength(5);
    handle.dispose();
  });

  it("builds only enabled layers", () => {
    const resolved = resolvePlatformEffectsStyle(
      { platformRings: true, platformHighlight: false, platformGrid: false, platformRipple: false },
      "tech",
      true,
      true,
    );
    const handle = buildGeo3dPlatformEffects(layout, resolved);
    expect(handle.group.children).toHaveLength(2);
    handle.dispose();
  });

  it("rotates rings on update", () => {
    const resolved = resolvePlatformEffectsStyle({ stylePreset: "tech" }, "tech", true, true);
    const handle = buildGeo3dPlatformEffects(layout, resolved);
    const ring1 = handle.group.children[1] as THREE.Mesh;
    const ring2 = handle.group.children[2] as THREE.Mesh;
    const z1Before = ring1.rotation.z;
    const z2Before = ring2.rotation.z;
    handle.update(1);
    expect(ring1.rotation.z).not.toBe(z1Before);
    expect(ring2.rotation.z).not.toBe(z2Before);
    handle.dispose();
  });

  it("tech preset enables platform effects by default", () => {
    expect(resolveGeo3dPlatformEffects({ stylePreset: "tech" })).toBe(true);
    expect(resolveGeo3dPlatformEffects({ stylePreset: "satellite" })).toBe(false);
  });

  it("layer flags default to all on when effects enabled", () => {
    expect(resolvePlatformLayerFlags({}, true)).toEqual({
      highlight: true,
      rings: true,
      grid: true,
      ripple: true,
    });
    expect(resolvePlatformLayerFlags({ platformGrid: false }, true).grid).toBe(false);
  });

  it("uses custom colors when set", () => {
    const resolved = resolvePlatformEffectsStyle(
      { platformRippleColor: "#ff0000" },
      "tech",
      true,
      true,
    );
    expect(resolved.colors.ripple).toBe("#ff0000");
  });

  it("applyGeo3dPlatformEffectsLayer mounts group to scene", () => {
    const scene = new THREE.Scene();
    const visual = resolveGeo3dVisualStyle({ stylePreset: "tech" }, true);
    const handle = applyGeo3dPlatformEffectsLayer(scene, layout, visual, { stylePreset: "tech" }, true);
    expect(handle).not.toBeNull();
    expect(scene.children.some((child) => child.name === GEO3D_PLATFORM_GROUP_NAME)).toBe(true);
    handle?.dispose();
  });

  it("applyGeo3dPlatformEffectsLayer returns null when all layers off", () => {
    const scene = new THREE.Scene();
    const visual = resolveGeo3dVisualStyle({ stylePreset: "tech" }, true);
    const handle = applyGeo3dPlatformEffectsLayer(
      scene,
      layout,
      visual,
      {
        stylePreset: "tech",
        platformHighlight: false,
        platformRings: false,
        platformGrid: false,
        platformRipple: false,
      },
      true,
    );
    expect(handle).toBeNull();
  });
});
