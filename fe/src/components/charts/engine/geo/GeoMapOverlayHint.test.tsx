import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GeoMapOverlayHint } from "./GeoMapOverlayHint";

describe("GeoMapOverlayHint", () => {
  it("renders as bottom overlay without taking layout flow", () => {
    const { container } = render(
      <div className="relative h-40">
        <GeoMapOverlayHint message="已是最后一层" data-testid="geo-map-hint" />
      </div>,
    );

    const hint = screen.getByTestId("geo-map-hint");
    expect(hint).toHaveAttribute("role", "status");
    expect(hint.className).toMatch(/absolute/);
    expect(hint.className).toMatch(/bottom-2/);
    expect(hint).toHaveTextContent("已是最后一层");
    expect(container.firstElementChild?.childElementCount).toBe(1);
  });
});
