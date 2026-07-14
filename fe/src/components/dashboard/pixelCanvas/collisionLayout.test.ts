import { describe, expect, it } from "vitest";
import type { DashboardLayoutV2, PixelLayoutWidget } from "../layoutUtils";
import {
  findNextOpenSlot,
  layoutsOverlap,
  packPixelLayoutSeamless,
  rectsOverlap,
  resolvePixelCollisions,
} from "./collisionLayout";
import { insertPixelPaletteWidget } from "./createPixelWidget";

const baseLayout = (widgets: PixelLayoutWidget[]): DashboardLayoutV2 => ({
  version: 2,
  canvas: { width: 1440, height: 900 },
  widgets,
  globalFilters: [],
});

const widget = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  order: number,
): PixelLayoutWidget => ({
  id,
  type: "chart",
  title: id,
  order,
  x,
  y,
  width,
  height,
});

describe("collisionLayout", () => {
  it("treats edge contact without gap as non-overlap", () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 100, y: 0, width: 100, height: 100 }, 0)).toBe(
      false,
    );
  });

  it("keeps layout unchanged when there is no collision", () => {
    const layout = baseLayout([
      widget("a", 0, 0, 300, 200, 1),
      widget("b", 400, 0, 300, 200, 2),
    ]);
    const resolved = resolvePixelCollisions(layout, "a", { x: 20, y: 10, width: 300, height: 200 });
    expect(resolved.widgets.find((item) => item.id === "a")).toMatchObject({ x: 20, y: 10 });
    expect(resolved.widgets.find((item) => item.id === "b")).toMatchObject({ x: 400, y: 0 });
    expect(layoutsOverlap(resolved, 0)).toBe(false);
  });

  it("keeps the active widget and pushes a colliding widget down", () => {
    const layout = baseLayout([
      widget("a", 100, 100, 300, 200, 1),
      widget("b", 120, 220, 300, 200, 2),
    ]);
    const resolved = resolvePixelCollisions(layout, "a", { x: 100, y: 200, width: 300, height: 200 });
    expect(resolved.widgets.find((item) => item.id === "a")).toMatchObject({ x: 100, y: 200 });
    expect(resolved.widgets.find((item) => item.id === "b")).toMatchObject({ x: 120, y: 400 });
    expect(layoutsOverlap(resolved, 0)).toBe(false);
  });

  it("cascades A -> B -> C in stable order", () => {
    const layout = baseLayout([
      widget("a", 100, 100, 300, 200, 1),
      widget("b", 120, 220, 300, 200, 2),
      widget("c", 140, 340, 300, 200, 3),
    ]);
    const resolved = resolvePixelCollisions(layout, "a", { x: 100, y: 300, width: 300, height: 200 });
    expect(resolved.widgets.find((item) => item.id === "b")).toMatchObject({ y: 500 });
    expect(resolved.widgets.find((item) => item.id === "c")).toMatchObject({ y: 700 });
    expect(layoutsOverlap(resolved, 0)).toBe(false);
  });

  it("produces the same result regardless of widget array order", () => {
    const widgets = [
      widget("c", 140, 340, 300, 200, 3),
      widget("a", 100, 100, 300, 200, 1),
      widget("b", 120, 220, 300, 200, 2),
    ];
    const forward = resolvePixelCollisions(baseLayout(widgets), "a", { x: 100, y: 300, width: 300, height: 200 });
    const reverse = resolvePixelCollisions(
      baseLayout([...widgets].reverse()),
      "a",
      { x: 100, y: 300, width: 300, height: 200 },
    );
    const sortById = (items: PixelLayoutWidget[]) =>
      [...items].sort((left, right) => left.id.localeCompare(right.id));
    expect(sortById(forward.widgets)).toEqual(sortById(reverse.widgets));
  });

  it("grows canvas height when push chain exceeds 900px", () => {
    const layout = baseLayout([
      widget("a", 0, 800, 300, 80, 1),
      widget("b", 0, 820, 300, 80, 2),
    ]);
    const resolved = resolvePixelCollisions(layout, "a", { x: 0, y: 820, width: 300, height: 80 });
    expect(resolved.canvas.height).toBeGreaterThanOrEqual(900);
    expect(layoutsOverlap(resolved, 0)).toBe(false);
  });

  it("packs overlapping widgets seamlessly from the top-left", () => {
    const layout = baseLayout([
      widget("a", 0, 0, 300, 200, 1),
      widget("b", 20, 40, 300, 200, 2),
      widget("c", 40, 80, 300, 200, 3),
    ]);
    const packed = packPixelLayoutSeamless(layout);
    expect(layoutsOverlap(packed, 0)).toBe(false);
    expect(packed.widgets[0]).toMatchObject({ x: 0, y: 0 });
    expect(packed.widgets[1]).toMatchObject({ x: 300, y: 0 });
    expect(packed.widgets[2]).toMatchObject({ x: 600, y: 0 });
  });

  it("terminates when many widgets start fully overlapping", () => {
    const widgets = Array.from({ length: 20 }, (_, index) =>
      widget(`w${index}`, 0, 0, 240, 160, index + 1),
    );
    const resolved = packPixelLayoutSeamless(baseLayout(widgets));
    expect(layoutsOverlap(resolved, 0)).toBe(false);
    expect(resolved.widgets.at(-1)?.y).toBeGreaterThan(0);
  });

  it("finds the next open slot to the right before wrapping downward", () => {
    const occupied = [
      { x: 0, y: 0, width: 480, height: 320 },
      { x: 480, y: 0, width: 480, height: 320 },
    ];
    const slot = findNextOpenSlot({ width: 480, height: 320 }, occupied, { width: 1440, height: 900 });
    expect(slot).toEqual({ x: 960, y: 0 });
  });

  it("inserts widgets into the next open slot without pushing existing ones", () => {
    const layout = baseLayout([widget("a", 0, 0, 360, 220, 1)]);
    const resolved = insertPixelPaletteWidget("bar", layout);
    expect(layoutsOverlap(resolved, 0)).toBe(false);
    expect(resolved.widgets.find((item) => item.id === "a")).toMatchObject({ x: 0, y: 0 });
    expect(resolved.widgets.find((item) => item.id !== "a")).toMatchObject({ x: 360, y: 0 });
  });
});
