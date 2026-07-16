import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaEditRail } from "./MediaEditRail";
import { defaultMediaConfig, type LayoutWidget } from "./layoutUtils";

const baseWidget = {
  id: "mw-1",
  title: "宣传图",
  col: 0,
  row: 0,
  colSpan: 4,
  rowSpan: 3,
  type: "media" as const,
  mediaConfig: defaultMediaConfig(),
};

describe("MediaEditRail", () => {
  afterEach(() => cleanup());

  it("renders single-column tabs with collapse rail button", () => {
    const onRailCollapse = vi.fn();
    render(
      <MediaEditRail
        widget={baseWidget as LayoutWidget & { mediaConfig: typeof baseWidget.mediaConfig }}
        onChange={() => {}}
        onRailCollapse={onRailCollapse}
      />,
    );
    expect(screen.getByRole("tab", { name: "数据" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "样式" })).toBeInTheDocument();
    expect(screen.queryByText("预览")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收起配置" })).toBeInTheDocument();
    expect(screen.getByText("图片来源")).toBeInTheDocument();
    expect(screen.getByText("宣传图")).toBeInTheDocument();
  });

  it("style tab exposes fit segments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MediaEditRail
        widget={baseWidget as LayoutWidget & { mediaConfig: typeof baseWidget.mediaConfig }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "样式" }));
    await user.click(screen.getByRole("button", { name: "覆盖" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fit: "cover" }));
  });
});
