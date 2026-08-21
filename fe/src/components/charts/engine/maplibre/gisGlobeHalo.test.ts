import { describe, expect, it, vi } from "vitest";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";
import {
  GEOLIBRE_HALO_OUTER_SCALE,
  GEOLIBRE_HALO_PUNCH_INSET,
} from "@/components/charts/engine/maplibre/gisGlobeHaloStops";

describe("gisGlobeHalo GeoLibre draw", () => {
  it("draws elliptical outer corona with screen blend", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      clip: vi.fn(),
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      globalCompositeOperation: "",
    } as unknown as CanvasRenderingContext2D;

    drawGlobeAtmosphereHalo(
      ctx,
      400,
      300,
      { cx: 200, cy: 150, rx: 120, ry: 90, rotation: 0.2 },
      "night",
    );

    expect(ctx.translate).toHaveBeenCalledWith(200, 150);
    expect(ctx.rotate).toHaveBeenCalledWith(0.2);
    expect(ctx.scale).toHaveBeenCalledWith(120, 90);
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(0, 0, 1, 0, 0, GEOLIBRE_HALO_OUTER_SCALE);
    expect(gradient.addColorStop).toHaveBeenCalledWith(0, "rgba(200, 235, 255, 1.0)");
    expect(ctx.clip).toHaveBeenCalledWith("evenodd");
    expect(ctx.arc).toHaveBeenCalledWith(0, 0, GEOLIBRE_HALO_PUNCH_INSET, 0, Math.PI * 2, true);
  });
});
