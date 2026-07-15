import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardContextInspector } from "./DashboardContextInspector";

afterEach(() => {
  cleanup();
});

describe("DashboardContextInspector", () => {
  it("renders dashboard config sections and toggles color scheme", async () => {
    const user = userEvent.setup();
    const onStyleChange = vi.fn();

    render(
      <DashboardContextInspector
        widgetCount={2}
        widgets={[]}
        styleConfig={{ gapPreset: "md", colorScheme: "light" }}
        onStyleChange={onStyleChange}
        embedded
        isPixelLayout
      />,
    );

    expect(screen.getByTestId("dashboard-config-inspector")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-theme-section")).toBeInTheDocument();
    expect(screen.getByText("仪表板风格")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-overall-config")).toBeInTheDocument();
    expect(screen.getByText("整体配置")).toBeInTheDocument();
    expect(screen.queryByText("筛选联动")).not.toBeInTheDocument();
    expect(screen.queryByText("高级样式设置")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "深色主题" }));
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
        widgetCount={1}
        widgets={[]}
        styleConfig={{ scaleMode: "canvas" }}
        onStyleChange={onStyleChange}
        embedded
        isPixelLayout
      />,
    );

    await user.click(screen.getByRole("button", { name: "组件比例" }));
    expect(onStyleChange).toHaveBeenCalledWith(
      expect.objectContaining({ scaleMode: "component" }),
    );
  });

  it("shows custom gap controls and emits gapPreset custom for pixel layout", async () => {
    const user = userEvent.setup();
    const onStyleChange = vi.fn();

    render(
      <DashboardContextInspector
        widgetCount={1}
        widgets={[]}
        styleConfig={{ gapPreset: "md", pixelGutter: 5, colorScheme: "light" }}
        onStyleChange={onStyleChange}
        embedded
        isPixelLayout
      />,
    );

    await user.click(screen.getByRole("button", { name: "自定义" }));
    expect(onStyleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        gapPreset: "custom",
        pixelGutter: 3,
      }),
    );

    onStyleChange.mockClear();
    render(
      <DashboardContextInspector
        widgetCount={1}
        widgets={[]}
        styleConfig={{ gapPreset: "custom", pixelGutter: 3, colorScheme: "light" }}
        onStyleChange={onStyleChange}
        embedded
        isPixelLayout
      />,
    );

    expect(screen.getByTestId("dashboard-gap-custom-controls")).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "自定义间隙滑块" });
    expect(slider).toHaveValue("3");

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "7" } });
    expect(onStyleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gapPreset: "custom",
        pixelGutter: 7,
      }),
    );

    fireEvent.change(slider, { target: { value: "12" } });
    expect(onStyleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gapPreset: "custom",
        pixelGutter: 12,
      }),
    );

    fireEvent.pointerUp(slider);
    expect(onStyleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gapPreset: "custom",
        pixelGutter: 12,
      }),
    );
  });

  it("shows DE-style number format section with preview", async () => {
    const user = userEvent.setup();
    render(
      <DashboardContextInspector
        widgetCount={1}
        widgets={[]}
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
