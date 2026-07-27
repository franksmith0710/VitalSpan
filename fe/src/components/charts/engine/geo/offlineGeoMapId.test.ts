import { describe, expect, it } from "vitest";
import {
  getOfflineGeoMap,
  resolveOfflineGeoMapId,
} from "@/components/charts/engine/geo/OfflineGeoPort";
import { ensureOfflineGeoMap } from "@/components/charts/engine/geo/geoMapLevels";
import { VS_REGIONS_MAP_ID } from "@/components/charts/engine/geo/geoConstants";

describe("offline geo map id resolution", () => {
  it("coerces empty mapId to national", () => {
    expect(resolveOfflineGeoMapId("")).toBe(VS_REGIONS_MAP_ID);
    expect(resolveOfflineGeoMapId("   ")).toBe(VS_REGIONS_MAP_ID);
    expect(resolveOfflineGeoMapId(null)).toBe(VS_REGIONS_MAP_ID);
    expect(resolveOfflineGeoMapId(undefined)).toBe(VS_REGIONS_MAP_ID);
  });

  it("always has national features", async () => {
    expect(await ensureOfflineGeoMap(VS_REGIONS_MAP_ID)).toBe(true);
    expect(await ensureOfflineGeoMap("")).toBe(true);
    const geo = getOfflineGeoMap("");
    expect(geo?.features?.length).toBeGreaterThan(30);
  });

  it("does not pretend unknown ids are national", async () => {
    expect(await ensureOfflineGeoMap("not-a-map")).toBe(false);
  });

  it("loads hunan city map and can return to national", async () => {
    expect(await ensureOfflineGeoMap("vs-geo-430000")).toBe(true);
    const hunan = getOfflineGeoMap("vs-geo-430000");
    expect(hunan?.features?.length).toBeGreaterThan(0);
    // 下钻资产不得被当成全国省级
    const nationalNames = new Set(
      (getOfflineGeoMap(VS_REGIONS_MAP_ID)?.features ?? [])
        .map((f) => f.properties?.name)
        .filter(Boolean),
    );
    const hunanNames = (hunan?.features ?? []).map((f) => f.properties?.name).filter(Boolean);
    expect(hunanNames.some((n) => n && !nationalNames.has(n))).toBe(true);
    expect(await ensureOfflineGeoMap(VS_REGIONS_MAP_ID)).toBe(true);
  });
});
