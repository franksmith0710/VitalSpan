import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

afterEach(() => {
  cleanup();
});

describe("PixelShape component gap", () => {
  it("applies inset padding from componentGap", () => {
    render(
      <PixelShape
        widget={widget}
        canvas={canvas}
        scale={1}
        mode="view"
        selected={false}
        componentGap={8}
      >
        <span>body</span>
      </PixelShape>,
    );

    const shape = screen.getByTestId("pixel-shape-w1");
    expect(shape).toHaveAttribute("data-component-gap", "8");
    expect(shape).toHaveStyle({ padding: "8px" });
    expect(screen.getByTestId("pixel-shape-body-w1")).toBeInTheDocument();
  });

  it("removes padding when componentGap is zero", () => {
    render(
      <PixelShape
        widget={widget}
        canvas={canvas}
        scale={1}
        mode="view"
        selected={false}
        componentGap={0}
      >
        <span>body</span>
      </PixelShape>,
    );

    const shape = screen.getByTestId("pixel-shape-w1");
    expect(shape).not.toHaveAttribute("data-component-gap", "8");
    expect(screen.queryByTestId("pixel-shape-body-w1")).not.toBeInTheDocument();
  });
});
