import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardContextInspector } from "./DashboardContextInspector";

const linkage = { filters: [], linkageRules: [], refreshMode: "eager" as const };

afterEach(() => {
  cleanup();
});

describe("DashboardContextInspector", () => {
  it("renders dashboard config sections and toggles color scheme", async () => {
    const user = userEvent.setup();
    const onStyleChange = vi.fn();
    const onSave = vi.fn();

    render(
      <DashboardContextInspector
        dashboardId="d1"
        widgetCount={2}
        filterWidgetCount={0}
        widgets={[]}
        linkage={linkage}
        effectiveLinkage={linkage}
        onLinkageChange={vi.fn()}
        styleConfig={{ gapPreset: "md", colorScheme: "light" }}
        onStyleChange={onStyleChange}
        onSave={onSave}
        embedded
        isPixelLayout
      />,
    );

    expect(screen.getByTestId("dashboard-config-inspector")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-theme-section")).toBeInTheDocument();
    expect(screen.getByText("仪表板风格")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-style-save")).toBeInTheDocument();
    expect(screen.getByText("筛选联动")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /筛选联动/ }));
    expect(screen.getByText(/暂无筛选器/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /深色主题/ }));
    expect(onStyleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        colorScheme: "dark",
        canvasBackground: expect.any(String),
      }),
    );
  });

  it("emits scaleMode when switching zoom mode", async () => {
    const user = userEvent.setup();
    const onStyleChange = vi.fn();
    render(
      <DashboardContextInspector
        dashboardId="d1"
        widgetCount={1}
        filterWidgetCount={0}
        widgets={[]}
        linkage={linkage}
        effectiveLinkage={linkage}
        onLinkageChange={vi.fn()}
        styleConfig={{ scaleMode: "canvas" }}
        onStyleChange={onStyleChange}
        embedded
        isPixelLayout
      />,
    );

    await user.click(screen.getByTestId("dashboard-overall-config").querySelector("button")!);
    await user.click(screen.getByRole("button", { name: "按组件比例" }));
    expect(onStyleChange).toHaveBeenCalledWith(
      expect.objectContaining({ scaleMode: "component" }),
    );
  });

  it("shows DE-style number format section with preview", async () => {
    const user = userEvent.setup();
    render(
      <DashboardContextInspector
        dashboardId="d1"
        widgetCount={1}
        filterWidgetCount={0}
        widgets={[]}
        linkage={linkage}
        effectiveLinkage={linkage}
        onLinkageChange={vi.fn()}
        styleConfig={{ numberFormat: { type: "auto", thousandSeparator: true } }}
        onStyleChange={vi.fn()}
        embedded
        isPixelLayout
      />,
    );

    await user.click(screen.getByRole("button", { name: /数字内容格式/ }));
    expect(screen.getByTestId("dashboard-number-format")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-number-format-preview")).toHaveTextContent(
      "示例20,000,000",
    );
  });
});
