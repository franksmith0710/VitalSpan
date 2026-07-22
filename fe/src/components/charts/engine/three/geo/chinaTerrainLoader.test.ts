import { describe, expect, it } from "vitest";
import {
  parseAdcodeFromMapId,
  resolveTerrainPackKey,
} from "@/components/charts/engine/three/geo/chinaTerrainLoader";
import { VS_REGIONS_MAP_ID } from "@/components/charts/engine/geo/geoConstants";

describe("resolveTerrainPackKey", () => {
  it("uses national L0 at drill depth 0", () => {
    expect(resolveTerrainPackKey(VS_REGIONS_MAP_ID, 0)).toEqual({
      level: "national",
      adcode: null,
    });
  });

  it("uses national L0 when mapId is vs-regions even if drilled", () => {
    expect(resolveTerrainPackKey(VS_REGIONS_MAP_ID, 2)).toEqual({
      level: "national",
      adcode: null,
    });
  });

  it("resolves pilot province L1 for vs-geo-440000", () => {
    expect(resolveTerrainPackKey("vs-geo-440000", 1)).toEqual({
      level: "province",
      adcode: 440000,
    });
  });

  it("falls back to national for province without L1 pack", () => {
    expect(resolveTerrainPackKey("vs-geo-330000", 1)).toEqual({
      level: "national",
      adcode: null,
    });
  });
});

describe("parseAdcodeFromMapId", () => {
  it("parses six-digit adcode", () => {
    expect(parseAdcodeFromMapId("vs-geo-440100")).toBe(440100);
  });

  it("returns null for non geo map id", () => {
    expect(parseAdcodeFromMapId(VS_REGIONS_MAP_ID)).toBeNull();
  });
});
