import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextWidget } from "./TextWidget";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";

const widget = {
  id: "text-1",
  type: "text",
  title: "说明",
  colSpan: 6,
  rowSpan: 2,
  order: 0,
  textConfig: { content: "<p>旧内容</p>", variant: "html" },
} satisfies LayoutWidget & { textConfig: TextWidgetConfig };

describe("TextWidget inline editing", () => {
  afterEach(() => {
    cleanup();
  });

  it("single click selects but double click opens editor", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TextWidget
        widget={widget}
        mode="edit"
        onSelect={onSelect}
        onTextConfigChange={vi.fn()}
      />,
    );
    const content = screen.getByTestId("text-widget-content");
    await user.click(content);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox", { name: "富文本内容" })).toBeNull();
    await user.dblClick(content);
    expect(await screen.findByTestId("rich-text-floating-toolbar")).toBeVisible();
    await screen.findByRole("textbox", { name: "富文本内容" });
  });

  it("shows a non-persistent placeholder for empty content", () => {
    render(
      <TextWidget
        widget={{ ...widget, textConfig: { content: "", variant: "html" } }}
        mode="edit"
      />,
    );
    expect(screen.getByText("双击编辑文字")).toBeVisible();
  });

  it("never creates an editor in view mode", () => {
    render(<TextWidget widget={widget} mode="view" />);
    const content = screen.getByTestId("text-widget-content");
    expect(within(content).getByText("旧内容")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "富文本内容" })).toBeNull();
  });

  it("shape shell hides grid header chrome like DataEase shape-inner", () => {
    render(
      <TextWidget
        widget={widget}
        mode="edit"
        shell="shape"
        onTextConfigChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("富文本标题")).toBeNull();
    expect(screen.queryByLabelText("拖动以移动组件")).toBeNull();
    expect(within(screen.getByTestId("text-widget-content")).getByText("旧内容")).toBeVisible();
  });
});
