import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CanvasEditToolbar } from "./CanvasEditToolbar";

describe("CanvasEditToolbar screen materials", () => {
  it("shows datetime and webpage under more and categorized library under 素材库", async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();

    render(
      <CanvasEditToolbar
        onInsert={onInsert}
        showScreenVisualAssets
        onAuxiliaryGridChange={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("toolbar-more-toggle"));
    expect(screen.getByTestId("screen-more-datetime")).toBeInTheDocument();
    expect(screen.getByTestId("screen-more-webpage")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /时钟/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /边框/ })).not.toBeInTheDocument();

    await user.click(screen.getByTestId("screen-more-datetime"));
    expect(onInsert).toHaveBeenCalledWith("screen-datetime");

    await user.click(screen.getByTestId("toolbar-insert-screen-material"));
    expect(screen.getByTestId("screen-material-category-border")).toBeInTheDocument();
    expect(screen.getByTestId("screen-material-border-1")).toBeInTheDocument();
  });
});
