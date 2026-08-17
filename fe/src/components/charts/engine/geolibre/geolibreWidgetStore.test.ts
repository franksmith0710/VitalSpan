import { describe, expect, it } from "vitest";
import { buildDefaultGeolibreProject } from "@/components/charts/engine/geolibre/geolibreProject";
import {
  createWidgetGeoLibreStore,
  getWidgetGeoLibreStore,
  registerWidgetGeoLibreStore,
  unregisterWidgetGeoLibreStore,
} from "@/components/charts/engine/geolibre/geolibreWidgetStore";

describe("geolibreWidgetStore", () => {
  it("isolates stores per widget id", () => {
    const projectA = buildDefaultGeolibreProject();
    const projectB = buildDefaultGeolibreProject();
    const storeA = createWidgetGeoLibreStore(projectA);
    const storeB = createWidgetGeoLibreStore(projectB);

    registerWidgetGeoLibreStore("widget-a", storeA);
    registerWidgetGeoLibreStore("widget-b", storeB);

    storeA.getState().setLayerOpacity(storeA.getState().layers[0]!.id, 0.2);
    expect(getWidgetGeoLibreStore("widget-a")?.getState().layers[0]?.opacity).toBe(0.2);
    expect(getWidgetGeoLibreStore("widget-b")?.getState().layers[0]?.opacity).toBe(1);

    unregisterWidgetGeoLibreStore("widget-a", storeA);
    unregisterWidgetGeoLibreStore("widget-b", storeB);
    expect(getWidgetGeoLibreStore("widget-a")).toBeUndefined();
  });
});
