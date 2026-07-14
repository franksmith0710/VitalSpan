import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetInlineTitle } from "./WidgetInlineTitle";

describe("WidgetInlineTitle", () => {
  afterEach(() => cleanup());

  it("shows plain text until clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <WidgetInlineTitle value="销售趋势" editable onChange={onChange} testId="title-w1" />,
    );
    expect(screen.getByTestId("title-w1")).toHaveTextContent("销售趋势");
    expect(screen.queryByLabelText("组件标题")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("title-w1"));
    expect(screen.getByLabelText("组件标题")).toHaveValue("销售趋势");
  });
});
