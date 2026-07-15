import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardStyleSurface } from "../DashboardStyleSurface";
import { PixelShape } from "./PixelShape";

const widget = {
  id: "w1",
  type: "text" as const,
  title: "文本",
  x: 0,
  y: 0,
  width: 200,
  height: 120,
  order: 1,
  textConfig: { content: "hello" },
};

const canvas = { width: 1920, height: 1080 };

function renderShape(gapPx: number) {
  return render(
    <DashboardStyleSurface componentGapPx={gapPx}>
      <PixelShape widget={widget} canvas={canvas} scale={1} mode="view" selected={false}>
        <span>body</span>
      </PixelShape>
    </DashboardStyleSurface>,
  );
}

afterEach(() => {
  cleanup();
});

describe("PixelShape component gap", () => {
  it("uses DE curGap CSS variable on gap shell", () => {
    const { container } = renderShape(8);

    const scope = container.querySelector(".dashboard-theme-scope");
    expect(scope).toHaveStyle({ "--dashboard-shape-gap": "8px" });

    const outer = screen.getByTestId("pixel-shape-w1");
    expect(outer).toHaveClass("dashboard-shape-gap-shell");
    expect(screen.getByTestId("pixel-shape-body-w1")).toBeInTheDocument();
  });

  it("animates gap shell with zero gap", () => {
    renderShape(0);

    const scope = screen.getByTestId("pixel-shape-w1").closest(".dashboard-theme-scope");
    expect(scope).toHaveStyle({ "--dashboard-shape-gap": "0px" });
  });
});
