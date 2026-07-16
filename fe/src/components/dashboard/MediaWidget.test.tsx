import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediaWidget } from "./MediaWidget";
import { defaultMediaConfig, type LayoutWidget } from "./layoutUtils";

const baseWidget = {
  id: "mw-tab-1",
  title: "页内图",
  col: 0,
  row: 0,
  colSpan: 4,
  rowSpan: 3,
  type: "media" as const,
  mediaConfig: defaultMediaConfig(),
};

describe("MediaWidget", () => {
  it("does not bubble edit selection to Tab host", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onParentClick = vi.fn();
    const onParentPointerDown = vi.fn();

    render(
      <div onClick={onParentClick} onPointerDown={onParentPointerDown}>
        <MediaWidget
          widget={baseWidget as LayoutWidget & { mediaConfig: typeof baseWidget.mediaConfig }}
          mode="edit"
          shell="shape"
          onSelect={onSelect}
        />
      </div>,
    );

    await user.click(screen.getByText("在右侧配置图片"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
