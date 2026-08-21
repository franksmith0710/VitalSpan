import { describe, expect, it, vi } from "vitest";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHalo";

describe("gisGlobeHalo", () => {
  it("draws outer corona with screen blend and inner punch-out", () => {
    const stops: number[] = [];
    const gradient = { addColorStop: vi.fn((_pos: number) => stops.push(_pos)) };
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      globalCompositeOperation: "",
    } as unknown as CanvasRenderingContext2D;

    drawGlobeAtmosphereHalo(ctx, 400, 300, { x: 200, y: 150, radius: 120 }, "night");

    expect(ctx.createRadialGradient).toHaveBeenCalledWith(200, 150, 120, 200, 150, 120 * 2.8);
    expect(gradient.addColorStop).toHaveBeenCalledTimes(7);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
    expect(ctx.arc).toHaveBeenCalledWith(200, 150, 120 * 0.985, 0, Math.PI * 2);
  });
});
