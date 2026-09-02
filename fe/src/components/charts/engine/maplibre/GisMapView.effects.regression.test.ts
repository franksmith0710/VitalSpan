import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GisMapView geolibre effects mount regression", () => {
  it("waits for async map bootstrap before mounting effects engine", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/charts/engine/maplibre/GisMapView.tsx"),
      "utf8",
    );

    expect(source).toContain("createGisGeolibreEffectsEngine");
    expect(source).toContain("ensureGisEffectsEngine");
    expect(source).toContain("gisPaintState !== \"ready\"");
    expect(source).toContain("mapRuntimeEpoch");
    expect(source).toContain("spaceBackdropForPreset");
    expect(source).toMatch(/style\.load.*ensureGisEffectsEngine|ensureGisEffectsEngine[\s\S]*style\.load/);
    expect(source).not.toContain("spaceBackdropCss");
    expect(source).not.toContain("mountGisGlobeHaloOverlay");
    expect(source).not.toContain("mountGisStarfieldOverlay");
  });
});
