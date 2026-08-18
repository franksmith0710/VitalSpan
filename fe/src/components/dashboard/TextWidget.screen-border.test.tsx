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

  it("renders DE border svg in shape shell with non-zero layout height", () => {
    const widget = asTextWidget(createScreenBorderWidget([], undefined, "border-1"));
    const { container } = render(
      <div
        className="flex flex-col"
        style={{ width: 320, height: 240, display: "flex" }}
        data-testid="pixel-host"
      >
        <TextWidget widget={widget} mode="edit" shell="shape" selected />
      </div>,
    );

    const content = screen.getByTestId("text-widget-content");
    expect(content).toBeInTheDocument();
    expect(container.querySelector("[data-screen-border-de] svg")).not.toBeNull();

    const host = screen.getByTestId("pixel-host");
    expect(host.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(content.getBoundingClientRect().height).toBeGreaterThan(0);
  });
});
