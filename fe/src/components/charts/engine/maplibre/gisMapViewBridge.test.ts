import { describe, expect, it, vi } from "vitest";
import {
  applyGisMapViewCamera,
  captureGisMapViewCamera,
  registerGisMapViewLiveControl,
} from "@/components/charts/engine/maplibre/gisMapViewBridge";

describe("gisMapViewBridge", () => {
  it("captures and applies registered camera by widget id", () => {
    const applyView = vi.fn(() => true);
    const dispose = registerGisMapViewLiveControl("w-gis", {
      capture: () => ({
        center: [120, 30],
        zoom: 4,
        bearing: 15,
        pitch: 45,
      }),
      applyView,
    });

    expect(captureGisMapViewCamera("w-gis")).toEqual({
      center: [120, 30],
      zoom: 4,
      bearing: 15,
      pitch: 45,
    });

    const next = { center: [116.4, 39.9] as [number, number], zoom: 8, bearing: 0, pitch: 0 };
    expect(applyGisMapViewCamera("w-gis", next)).toBe(true);
    expect(applyView).toHaveBeenCalledWith(next);

    dispose();
    expect(captureGisMapViewCamera("w-gis")).toBeNull();
    expect(applyGisMapViewCamera("w-gis", next)).toBe(false);
  });
});
