import { describe, expect, it } from "vitest";
import {
  gisLayerClusterGlowId,
  gisLayerClusterHaloId,
  gisLayerHeatmapDetailGlowId,
  gisLayerHeatmapGlowId,
  gisLayerHeatmapHaloId,
  gisLayerHeatmapId,
  gisLayerScatterGlowId,
  gisLayerScatterHaloId,
  gisLayerSourceId,
} from "@/components/charts/engine/maplibre/gisMapLayerStyle";

describe("gisMapLayerStyle ids", () => {
  it("builds stable source and heatmap layer ids", () => {
    expect(gisLayerSourceId("layer-a")).toBe("vs-gis-layer-layer-a");
    expect(gisLayerHeatmapId("layer-a")).toBe("vs-gis-layer-layer-a-heat");
    expect(gisLayerHeatmapHaloId("layer-a")).toBe("vs-gis-layer-layer-a-heat-halo");
    expect(gisLayerHeatmapGlowId("layer-a")).toBe("vs-gis-layer-layer-a-heat-glow");
    expect(gisLayerHeatmapDetailGlowId("layer-a")).toBe("vs-gis-layer-layer-a-heat-detail-glow");
    expect(gisLayerScatterHaloId("layer-a")).toBe("vs-gis-layer-layer-a-scatter-halo");
    expect(gisLayerScatterGlowId("layer-a")).toBe("vs-gis-layer-layer-a-glow");
    expect(gisLayerClusterGlowId("layer-a")).toBe("vs-gis-layer-layer-a-cluster-glow");
    expect(gisLayerClusterHaloId("layer-a")).toBe("vs-gis-layer-layer-a-cluster-halo");
  });
});
