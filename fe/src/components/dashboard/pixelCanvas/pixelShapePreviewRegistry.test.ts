import { describe, expect, it, vi } from "vitest";
import { createPixelShapePreviewRegistry } from "./pixelShapePreviewRegistry";

describe("createPixelShapePreviewRegistry", () => {
  it("applies preview rects to registered shapes", () => {
    const registry = createPixelShapePreviewRegistry();
    const sync = vi.fn();
    registry.register("w1", sync);
    registry.applyAll(
      new Map([["w1", { x: 10, y: 20, width: 300, height: 200 }]]),
    );
    expect(sync).toHaveBeenCalledWith({ x: 10, y: 20, width: 300, height: 200 });
  });
});
