import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { syncOverlayCanvasSize } from "@/components/charts/engine/maplibre/gisOverlayCanvas";

describe("syncOverlayCanvasSize", () => {
  it("updates canvas bitmap when container grows", () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const lastSize = { width: 0, height: 0 };

    expect(syncOverlayCanvasSize(canvas, ctx, 320, 240, lastSize)).toBe(true);
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(lastSize).toEqual({ width: 320, height: 240 });

    const widthBefore = canvas.width;
    expect(syncOverlayCanvasSize(canvas, ctx, 320, 240, lastSize)).toBe(false);
    expect(canvas.width).toBe(widthBefore);

    expect(syncOverlayCanvasSize(canvas, ctx, 640, 480, lastSize)).toBe(true);
    expect(canvas.width).toBeGreaterThan(widthBefore);
    expect(lastSize).toEqual({ width: 640, height: 480 });
  });
});

describe("gis overlay resize regression", () => {
  it("starfield syncs canvas size during paint, not only on ResizeObserver", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/charts/engine/maplibre/gisStarfield.ts"),
      "utf8",
    );
    expect(source).toContain("syncCanvasSize(width, height)");
    expect(source).not.toContain("canvas.style.width");
  });
});
