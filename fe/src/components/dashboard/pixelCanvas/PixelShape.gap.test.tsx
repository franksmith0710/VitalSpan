import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("keeps gap shell transparent so artboard shows through padding", () => {
    const { container } = renderShape(8);
    const outer = screen.getByTestId("pixel-shape-w1");
    expect(outer).toHaveClass("dashboard-shape-gap-shell");
    expect(outer.className).toContain("bg-transparent");

    const scope = container.querySelector(".dashboard-theme-scope");
    scope?.setAttribute("data-dashboard-color-scheme", "dark");
    scope?.classList.add("dark");
    expect(outer.className).toContain("bg-transparent");
  });
});

describe("PixelShape action rail", () => {
  it("renders floating action rail when selected in edit mode", () => {
    render(
      <DashboardStyleSurface componentGapPx={0}>
        <PixelShape
          widget={widget}
          canvas={canvas}
          scale={1}
          mode="edit"
          selected
          viewport={{ x: 0, y: 0, width: 1920, height: 1080 }}
          widgetActions={{ onCopy: vi.fn(), onDelete: vi.fn() }}
        >
          <span>body</span>
        </PixelShape>
      </DashboardStyleSurface>,
    );

    expect(screen.getByTestId("pixel-shape-actions-w1")).toBeInTheDocument();
    expect(screen.getByTestId("pixel-shape-body-w1")).toHaveClass("overflow-visible");
  });

  it("hides action rail when chrome.showFloatingActions is off", () => {
    render(
      <DashboardStyleSurface componentGapPx={0}>
        <PixelShape
          widget={widget}
          canvas={canvas}
          scale={1}
          mode="edit"
          selected
          viewport={{ x: 0, y: 0, width: 1920, height: 1080 }}
          widgetActions={{ onCopy: vi.fn() }}
          styleConfig={{ chrome: { showFloatingActions: false } }}
        >
          <span>body</span>
        </PixelShape>
      </DashboardStyleSurface>,
    );

    expect(screen.queryByTestId("pixel-shape-actions-w1")).not.toBeInTheDocument();
  });
});
