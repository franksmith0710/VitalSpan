import { describe, expect, it, vi } from "vitest";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { VS_REGIONS_MAP_ID } from "@/components/charts/engine/geo/geoConstants";
import { GEO_MAP_FALLBACK_BANNER, GEO_MAP_QUALITY_FALLBACK_BANNER } from "@/components/charts/engine/geo/geoMapRenderResult";
import * as geo3dQuality from "@/components/charts/engine/three/geo3dQuality";
import { renderThreeChoroplethChart } from "@/components/charts/engine/three/renderThreeChoropleth";

describe("renderThreeChoroplethChart", () => {
  it("returns d3-fallback when WebGL is unavailable (jsdom)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const result = await renderThreeChoroplethChart(container, {
      width: 400,
      height: 300,
      colors: ["#465fff"],
      theme: getAntvThemeTokens("light"),
      showTooltip: false,
      rows: [
        ["广东省", 320],
        ["浙江省", 280],
      ],
      columns: ["province", "value"],
      regionField: "province",
      metricField: "value",
      mapId: VS_REGIONS_MAP_ID,
      isDark: false,
      geoStyle: {},
    });

    expect(result.engine).toBe("d3-fallback");
    expect(result.fallbackReason).toBe("webgl-unavailable");
    expect(container.querySelector("svg")).toBeTruthy();
    result.dispose();
    container.remove();
  });

  it("returns d3-fallback when quality auto degrades to low", async () => {
    vi.spyOn(geo3dQuality, "resolveGeo3dQuality").mockReturnValue("low");
    vi.spyOn(geo3dQuality, "shouldRenderGeo3d").mockReturnValue(false);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const result = await renderThreeChoroplethChart(container, {
      width: 400,
      height: 300,
      colors: ["#465fff"],
      theme: getAntvThemeTokens("light"),
      showTooltip: false,
      rows: [
        ["广东省", 320],
        ["浙江省", 280],
      ],
      columns: ["province", "value"],
      regionField: "province",
      metricField: "value",
      mapId: VS_REGIONS_MAP_ID,
      drillDepth: 2,
      isDark: false,
      geoStyle: {},
      geo3dStyle: { quality: "auto" },
    });

    expect(result.engine).toBe("d3-fallback");
    expect(result.fallbackReason).toBe("quality-degraded");
    result.dispose();
    container.remove();
    vi.restoreAllMocks();
  });
});

describe("GEO_MAP_FALLBACK_BANNER", () => {
  it("is user-facing copy for WebGL downgrade", () => {
    expect(GEO_MAP_FALLBACK_BANNER).toContain("WebGL");
    expect(GEO_MAP_FALLBACK_BANNER).toContain("2D");
  });

  it("has quality degradation copy", () => {
    expect(GEO_MAP_QUALITY_FALLBACK_BANNER).toContain("2D");
    expect(GEO_MAP_QUALITY_FALLBACK_BANNER).toContain("流畅");
  });
});
