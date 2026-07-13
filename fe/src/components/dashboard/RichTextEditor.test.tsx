import { useRef, type ComponentProps } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./RichTextEditor";

function RichTextEditorHarness(
  props: Omit<ComponentProps<typeof RichTextEditor>, "anchorRef">,
) {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={anchorRef} className="relative h-64 w-[32rem] rounded-xl border border-gray-200">
      <RichTextEditor {...props} anchorRef={anchorRef} />
    </div>
  );
}

describe("RichTextEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("commits sanitized html with Ctrl+Enter", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <RichTextEditorHarness
        initialHtml="<p>初始</p>"
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    const editor = await screen.findByRole("textbox", { name: "富文本内容" });
    await waitFor(() => expect(editor).toHaveFocus());
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onCommit).toHaveBeenCalledWith("<p>初始</p>");
  });

  it("cancels with Escape without committing", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    render(
      <RichTextEditorHarness
        initialHtml="<p>初始</p>"
        onCommit={onCommit}
        onCancel={onCancel}
      />,
    );
    const editor = await screen.findByRole("textbox", { name: "富文本内容" });
    await waitFor(() => expect(editor).toHaveFocus());
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("shows floating toolbar outside the widget frame", async () => {
    render(
      <RichTextEditorHarness
        initialHtml="<p>初始</p>"
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await screen.findByRole("textbox", { name: "富文本内容" });
    const toolbar = await screen.findByTestId("rich-text-floating-toolbar");
    expect(toolbar).toBeVisible();
    expect(toolbar.className).toContain("fixed");
  });

  it("does not commit when choosing a color from the portaled menu", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <RichTextEditorHarness
        initialHtml="<p>初始</p>"
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    await screen.findByRole("textbox", { name: "富文本内容" });
    await user.click(screen.getByRole("button", { name: "文字颜色" }));
    await user.click(await screen.findByText("#dc2626"));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("stops pointer events from reaching dashboard drag surface", async () => {
    const parentPointerDown = vi.fn();
    const user = userEvent.setup();
    render(
      <div onPointerDown={parentPointerDown}>
        <RichTextEditorHarness
          initialHtml="<p>初始</p>"
          onCommit={vi.fn()}
          onCancel={vi.fn()}
        />
      </div>,
    );
    await user.click(await screen.findByRole("button", { name: "撤销" }));
    expect(parentPointerDown).not.toHaveBeenCalled();
  });
});
