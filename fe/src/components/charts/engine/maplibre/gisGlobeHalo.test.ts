import { describe, expect, it, vi } from "vitest";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";
import { GEOLIBRE_HALO_OUTER_SCALE, GEOLIBRE_HALO_PUNCH_INSET } from "@/components/charts/engine/maplibre/gisGlobeHaloStops";

describe("gisGlobeHalo GeoLibre draw", () => {
  it("uses Leonel Dias gradient and screen blend", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
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
    expect(gradient.addColorStop).toHaveBeenCalledWith(0, "rgba(200, 235, 255, 1.0)");
    expect(gradient.addColorStop).toHaveBeenCalledTimes(7);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
  });

  it("clips inner disc when rendering above the map", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      clip: vi.fn(),
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      globalCompositeOperation: "",
    } as unknown as CanvasRenderingContext2D;

    drawGlobeAtmosphereHalo(ctx, 400, 300, { x: 200, y: 150, radius: 120 }, "night", {
      clipInnerRing: true,
    });

    expect(ctx.clip).toHaveBeenCalledWith("evenodd");
    expect(ctx.arc).toHaveBeenCalledWith(
      200,
      150,
      120 * GEOLIBRE_HALO_PUNCH_INSET,
      0,
      Math.PI * 2,
      true,
    );
  });
});
