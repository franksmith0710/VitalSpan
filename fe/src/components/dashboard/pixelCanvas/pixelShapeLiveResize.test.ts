import { describe, expect, it, vi } from "vitest";
import { dispatchPixelShapeLiveResize, PIXEL_SHAPE_LIVE_RESIZE } from "./pixelShapeLiveResize";

describe("pixelShapeLiveResize", () => {
  it("dispatches document live resize event", () => {
    const handler = vi.fn();
    document.addEventListener(PIXEL_SHAPE_LIVE_RESIZE, handler);
    dispatchPixelShapeLiveResize();
    document.removeEventListener(PIXEL_SHAPE_LIVE_RESIZE, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
