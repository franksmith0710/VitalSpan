import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TextWidget } from "./TextWidget";
import { createScreenBorderWidget } from "@/lib/screenVisualAssets";
import type { LayoutWidget } from "./layoutUtils";

function asTextWidget(widget: LayoutWidget) {
  return widget as LayoutWidget & { textConfig: NonNullable<LayoutWidget["textConfig"]> };
}

describe("TextWidget screen border on pixel canvas", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      width: 320,
      height: 240,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 240,
    } as DOMRect);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders DE border svg in shape shell", () => {
    const widget = asTextWidget(createScreenBorderWidget([], undefined, "border-1"));
    const { container } = render(
      <div style={{ width: 320, height: 240 }}>
        <TextWidget widget={widget} mode="edit" shell="shape" selected />
      </div>,
    );

    expect(screen.getByTestId("text-widget-content")).toBeInTheDocument();
    expect(container.querySelector("[data-screen-border-de] svg")).not.toBeNull();
  });
});
