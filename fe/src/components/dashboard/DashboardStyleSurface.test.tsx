import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardStyleSurface } from "./DashboardStyleSurface";

afterEach(cleanup);

describe("DashboardStyleSurface", () => {
  it("scopes theme only and does not paint canvas background on the wrapper", () => {
    render(
      <DashboardStyleSurface styleConfig={{ canvasBackground: "#f1c40f" }}>
        <span data-testid="child">canvas</span>
      </DashboardStyleSurface>,
    );
    const surface = screen.getByTestId("child").parentElement;
    expect(surface).toHaveAttribute("data-canvas-user-bg", "true");
    expect(surface).toHaveAttribute("data-dashboard-color-scheme", "light");
    expect(surface).not.toHaveStyle({ background: "#f1c40f" });
  });

  it("applies dark theme class without coupling to user background", () => {
    render(
      <DashboardStyleSurface
        styleConfig={{ colorScheme: "dark", canvasBackground: "#f1c40f" }}
      >
        <span data-testid="child">canvas</span>
      </DashboardStyleSurface>,
    );
    const surface = screen.getByTestId("child").parentElement;
    expect(surface).toHaveClass("dark");
    expect(surface).toHaveAttribute("data-dashboard-color-scheme", "dark");
    expect(surface).not.toHaveStyle({ background: "#f1c40f" });
  });
});
