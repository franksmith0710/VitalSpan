import { describe, expect, it } from "vitest";
import {
  captureGisMapViewCamera,
  registerGisMapViewCapture,
} from "@/components/charts/engine/maplibre/gisMapViewBridge";

describe("gisMapViewBridge", () => {
  it("captures registered camera by widget id", () => {
    const dispose = registerGisMapViewCapture("w-gis", () => ({
      center: [120, 30],
      zoom: 4,
      bearing: 15,
      pitch: 45,
    }));

    expect(captureGisMapViewCamera("w-gis")).toEqual({
      center: [120, 30],
      zoom: 4,
      bearing: 15,
      pitch: 45,
    });

    dispose();
    expect(captureGisMapViewCamera("w-gis")).toBeNull();
  });
});
