import { describe, expect, it } from "vitest";
import {
  gisLayerHeatmapId,
  gisLayerSourceId,
} from "@/components/charts/engine/maplibre/gisMapLayerStyle";

describe("gisMapLayerStyle ids", () => {
  it("builds stable source and heatmap layer ids", () => {
    expect(gisLayerSourceId("layer-a")).toBe("vs-gis-layer-layer-a");
    expect(gisLayerHeatmapId("layer-a")).toBe("vs-gis-layer-layer-a-heat");
  });
});
