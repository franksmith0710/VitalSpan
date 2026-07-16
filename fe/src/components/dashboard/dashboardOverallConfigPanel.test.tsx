import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardOverallConfigPanel } from "./dashboardOverallConfigPanel";

afterEach(cleanup);

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
    expect(screen.queryByText(/20px 参考网格/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "辅助对齐网格" }));

    expect(patchStyle).toHaveBeenCalledWith({
      chrome: { showAuxiliaryGrid: false },
    });
  });

  it("patches widgetStyle border from 组件线框 controls", async () => {
    const user = userEvent.setup();
    const patchStyle = vi.fn();

    render(
      <DashboardOverallConfigPanel
        styleConfig={{ widgetStyle: { borderEnabled: true, borderWidth: 1 } }}
        patchStyle={patchStyle}
        isPixelLayout
      />,
    );

    const lineBorderField = screen.getByText("组件线框").closest("div")!.parentElement!;
    await user.click(within(lineBorderField).getByRole("switch", { name: "显示线框" }));

    expect(patchStyle).toHaveBeenCalledWith({
      widgetStyle: expect.objectContaining({ borderEnabled: false }),
    });
  });
});
