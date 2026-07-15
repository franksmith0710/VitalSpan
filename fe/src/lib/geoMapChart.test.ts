import { describe, expect, it } from "vitest";
import {
  analyzeGeoMapMatch,
  buildGeoHeatmapEchartsOption,
  buildGeoMapEchartsOption,
  buildGeoMapPlaceholderEchartsOption,
  isNumericRegionIdDimension,
  resolveMapRegionName,
  VS_GEO_MAP_PLACEHOLDER_FLAG,
} from "./geoMapChart";

describe("resolveMapRegionName", () => {
  it("matches province names with administrative suffixes", () => {
    expect(resolveMapRegionName("北京市").name).toBe("北京市");
    expect(resolveMapRegionName("广东省").name).toBe("广东省");
    expect(resolveMapRegionName("上海").name).toBe("上海市");
    expect(resolveMapRegionName("上海").matched).toBe(true);
  });

  it("resolves region codes and adcodes", () => {
    expect(resolveMapRegionName("BJ").name).toBe("北京市");
    expect(resolveMapRegionName("110000").name).toBe("北京市");
  });
});

describe("analyzeGeoMapMatch", () => {
  it("flags unmatched numeric region ids", () => {
    const stats = analyzeGeoMapMatch(
      [
        [5, 100],
        [7, 80],
      ],
      ["region_id", "value"],
      "region_id",
    );
    expect(stats.matched).toBe(0);
    expect(stats.unmatched).toContain("5");
  });
});

describe("buildGeoMapPlaceholderEchartsOption", () => {
  it("renders china silhouette without visualMap", () => {
    const option = buildGeoMapPlaceholderEchartsOption();
    expect(option[VS_GEO_MAP_PLACEHOLDER_FLAG]).toBe(true);
    expect(option.visualMap).toBeUndefined();
    const series = option.series as Array<Record<string, unknown>>;
    expect(series[0].type).toBe("map");
    expect(series[0].data).toEqual([]);
  });
});

describe("buildGeoMapEchartsOption", () => {
  it("builds choropleth map with visualMap and roam", () => {
    const option = buildGeoMapEchartsOption({
      rows: [
        ["北京市", 120],
        ["上海", 80],
        ["广东", 200],
      ],
      columns: ["region", "value"],
      regionField: "region",
      metricField: "value",
    });
    const series = option.series as Array<Record<string, unknown>>;
    expect(series[0].type).toBe("map");
    expect(series[0].roam).toBe(true);
    expect(series[0].layoutSize).toBe("92%");
    expect(option.visualMap).toBeTruthy();
    const data = series[0].data as Array<{ name: string; value: number }>;
    expect(data[0].name).toBe("北京市");
    expect(data[2].name).toBe("广东省");
  });
});

describe("isNumericRegionIdDimension", () => {
  it("detects numeric region_id samples", () => {
    expect(isNumericRegionIdDimension("region_id", ["region_id", "v"], [[5, 1]])).toBe(true);
    expect(isNumericRegionIdDimension("region", ["region", "v"], [["北京", 1]])).toBe(false);
  });
});

describe("buildGeoHeatmapEchartsOption", () => {
  it("uses category indices for heatmap cells", () => {
    const option = buildGeoHeatmapEchartsOption({
      rows: [
        ["A", "Y1", 10],
        ["B", "Y1", 20],
        ["A", "Y2", 5],
      ],
      columns: ["x", "y", "v"],
      xField: "x",
      yField: "y",
      metricField: "v",
    });
    const series = option.series as Array<{ data: Array<[number, number, number]> }>;
    expect(series[0].data[0]).toEqual([0, 0, 10]);
    expect(series[0].data[1]).toEqual([1, 0, 20]);
  });
});
