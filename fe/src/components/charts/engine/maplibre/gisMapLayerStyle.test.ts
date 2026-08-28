import { describe, expect, it } from "vitest";
import {
  gisLayerClusterGlowId,
  gisLayerHeatmapGlowId,
  gisLayerHeatmapId,
  gisLayerScatterGlowId,
  gisLayerSourceId,
} from "@/components/charts/engine/maplibre/gisMapLayerStyle";

describe("gisMapLayerStyle ids", () => {
  it("builds stable source and heatmap layer ids", () => {
    expect(gisLayerSourceId("layer-a")).toBe("vs-gis-layer-layer-a");
    expect(gisLayerHeatmapId("layer-a")).toBe("vs-gis-layer-layer-a-heat");
    expect(gisLayerHeatmapGlowId("layer-a")).toBe("vs-gis-layer-layer-a-heat-glow");
    expect(gisLayerScatterGlowId("layer-a")).toBe("vs-gis-layer-layer-a-glow");
    expect(gisLayerClusterGlowId("layer-a")).toBe("vs-gis-layer-layer-a-cluster-glow");
  });
});
