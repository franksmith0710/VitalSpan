import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScreenTitleBarDisplay } from "./ScreenTitleBarDisplay";

describe("ScreenTitleBarDisplay", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title decoration as image asset", () => {
    render(<ScreenTitleBarDisplay title="云平台组织资源大屏" />);
    expect(screen.getByText("云平台组织资源大屏")).toBeInTheDocument();
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain("screen-header-de-trapezoid-wing");
    expect(document.querySelector("[data-screen-title-bar-mode='image']")).toBeTruthy();
  });

  it("falls back to simple gradient lines when variant is simple", () => {
    render(
      <ScreenTitleBarDisplay
        title="简约标题"
        styleConfig={{ variant: "simple", showSideLines: true }}
      />,
    );
    expect(screen.getByText("简约标题")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("[data-screen-title-bar-mode='simple']")).toBeTruthy();
  });
});
