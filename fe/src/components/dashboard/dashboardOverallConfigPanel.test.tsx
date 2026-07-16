import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardOverallConfigPanel } from "./dashboardOverallConfigPanel";

describe("DashboardOverallConfigPanel", () => {
  it("patches chrome.showAuxiliaryGrid from 辅助对齐网格 toggle", async () => {
    const user = userEvent.setup();
    const patchStyle = vi.fn();

    render(
      <DashboardOverallConfigPanel
        styleConfig={{}}
        patchStyle={patchStyle}
        isPixelLayout
      />,
    );

    expect(screen.getByText("辅助对齐网格")).toBeInTheDocument();
    expect(screen.getByText(/20px 网格线/)).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "辅助对齐网格" }));

    expect(patchStyle).toHaveBeenCalledWith({
      chrome: { showAuxiliaryGrid: false },
    });
  });

  it("shows grid-layout hint when not pixel canvas", () => {
    render(
      <DashboardOverallConfigPanel
        styleConfig={{}}
        patchStyle={vi.fn()}
        isPixelLayout={false}
      />,
    );

    expect(screen.getByText(/12 列矩阵布局对齐/)).toBeInTheDocument();
  });
});
