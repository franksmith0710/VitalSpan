import { describe, expect, it } from "vitest";
import { createPaletteWidget } from "./createLayoutWidget";
import {
  isScreenTitleBarWidget,
  SCREEN_TITLE_BAR_MARKER,
} from "@/lib/screenVisualAssets";

describe("createPaletteWidget screen-title-bar", () => {
  it("creates title bar widget for toolbar insert integration", () => {
    const widget = createPaletteWidget("screen-title-bar", []);
    expect(widget.type).toBe("text");
    expect(widget.title).toBe("标题装饰");
    expect(widget.textConfig?.content).toBe(SCREEN_TITLE_BAR_MARKER);
    expect(isScreenTitleBarWidget(widget)).toBe(true);
  });
});
