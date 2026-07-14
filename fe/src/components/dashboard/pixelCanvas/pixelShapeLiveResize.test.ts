import { describe, expect, it } from "vitest";
import {
  applyContentLiveScale,
  isResizeInteraction,
  resetContentLiveScale,
} from "./pixelShapeLiveResize";

describe("pixelShapeLiveResize", () => {
  it("treats move as non-resize", () => {
    expect(isResizeInteraction("move")).toBe(false);
    expect(isResizeInteraction("se")).toBe(true);
  });

  it("applies and resets CSS scale on inner content", () => {
    const el = document.createElement("div");
    applyContentLiveScale(
      el,
      { x: 0, y: 0, width: 200, height: 100 },
      { x: 0, y: 0, width: 400, height: 150 },
    );
    expect(el.style.width).toBe("200px");
    expect(el.style.height).toBe("100px");
    expect(el.style.transform).toBe("scale(2, 1.5)");
    expect(el.style.transformOrigin).toBe("top left");

    resetContentLiveScale(el);
    expect(el.style.width).toBe("");
    expect(el.style.transform).toBe("");
  });
});
