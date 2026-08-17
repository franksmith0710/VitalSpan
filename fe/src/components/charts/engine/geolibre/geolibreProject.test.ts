import { describe, expect, it } from "vitest";
import {
  VITALSPAN_CHINA_LAYER_ID,
  applyBasemapChoice,
  basemapChoiceFromProject,
  buildDefaultGeolibreProject,
  readGeolibreProject,
} from "@/components/charts/engine/geolibre/geolibreProject";
import { DEFAULT_GIS_PROJECT } from "@/components/charts/engine/maplibre/gisProject";

describe("geolibreProject", () => {
  it("builds offline default with china provinces layer", () => {
    const project = buildDefaultGeolibreProject();
    expect(project.basemapStyleUrl).toBe("");
    expect(project.layers.some((layer) => layer.id === VITALSPAN_CHINA_LAYER_ID)).toBe(true);
  });

  it("migrates legacy gisProject blank basemap", () => {
    const project = readGeolibreProject({
      chartType: "gis-map",
      nativeBody: {
        gisProject: { basemap: "blank", view: DEFAULT_GIS_PROJECT.view },
      },
    });
    expect(project.layers).toHaveLength(0);
    expect(basemapChoiceFromProject(project)).toBe("blank");
  });

  it("migrates legacy gisProject china-provinces", () => {
    const project = readGeolibreProject({
      chartType: "gis-map",
      nativeBody: { gisProject: DEFAULT_GIS_PROJECT },
    });
    expect(basemapChoiceFromProject(project)).toBe("china-provinces");
  });

  it("round-trips geolibreProject from nativeBody", () => {
    const source = buildDefaultGeolibreProject();
    const read = readGeolibreProject({
      chartType: "gis-map",
      nativeBody: { geolibreProject: source },
    });
    expect(read.layers[0]?.id).toBe(VITALSPAN_CHINA_LAYER_ID);
    expect(applyBasemapChoice(read, "blank").layers).toHaveLength(0);
  });
});
