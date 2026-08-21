import { describe, expect, it, vi } from "vitest";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";
import { GEOLIBRE_HALO_OUTER_SCALE } from "@/components/charts/engine/maplibre/gisGlobeHaloStops";

describe("gisGlobeHalo GeoLibre draw", () => {
  it("draws screen-blended halo below map without punching the globe", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      globalCompositeOperation: "",
    } as unknown as CanvasRenderingContext2D;

    drawGlobeAtmosphereHalo(ctx, 400, 300, { x: 200, y: 150, radius: 120 }, "night");

    expect(ctx.createRadialGradient).toHaveBeenCalledWith(
      200,
      150,
      120,
      200,
      150,
      120 * GEOLIBRE_HALO_OUTER_SCALE,
    );
    expect(ctx.fill).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
    expect(ctx.restore).toHaveBeenCalled();
  });
});
