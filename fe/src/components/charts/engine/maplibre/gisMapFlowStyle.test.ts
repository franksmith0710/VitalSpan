import { describe, expect, it } from "vitest";
import {
  buildGisFlowLayerDefinitions,
  buildGisFlowStyleKey,
  emptyGisFlowGeoJson,
} from "@/components/charts/engine/maplibre/gisMapFlowStyle";

describe("gisMapFlowStyle", () => {
  it("adds flow source and line layer", () => {
    const { source, layers } = buildGisFlowLayerDefinitions(emptyGisFlowGeoJson(), {
      flavor: "light",
      flow: { enabled: true, color: "#112233", opacity: 0.6 },
    });
    expect(source.id).toBe("vs-gis-flow");
    expect(layers).toHaveLength(1);
    expect(layers[0]?.id).toBe("vs-gis-flow-lines");
    expect(layers[0]?.paint?.["line-color"]).toBeDefined();
  });

  it("changes style key when flow paint changes", () => {
    const a = buildGisFlowStyleKey({ flavor: "light", flow: { enabled: true, color: "#111111" } });
    const b = buildGisFlowStyleKey({ flavor: "light", flow: { enabled: true, color: "#222222" } });
    expect(a).not.toBe(b);
  });
});
