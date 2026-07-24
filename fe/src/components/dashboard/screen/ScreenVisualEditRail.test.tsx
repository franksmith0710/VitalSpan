import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScreenVisualEditRail } from "./ScreenVisualEditRail";
import { SCREEN_CLOCK_MARKER } from "@/lib/screenVisualAssets";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";

const clockWidget = {
  id: "clock-1",
  type: "text",
  title: "时钟",
  colSpan: 6,
  rowSpan: 1,
  order: 0,
  textConfig: {
    content: SCREEN_CLOCK_MARKER,
    variant: "plain" as const,
  },
} satisfies LayoutWidget & { textConfig: NonNullable<LayoutWidget["textConfig"]> };

describe("ScreenVisualEditRail", () => {
  it("updates clock style from style tab", async () => {
    const user = userEvent.setup();
    const onTextConfigChange = vi.fn();

    render(
      <ScreenVisualEditRail
        widget={clockWidget}
        onTextConfigChange={onTextConfigChange}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "样式" }));
    const fontSizeInput = screen.getByDisplayValue("18");
    fireEvent.change(fontSizeInput, { target: { value: "24" } });

    expect(onTextConfigChange).toHaveBeenCalled();
    const lastCall = onTextConfigChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.screenStyle?.clock?.fontSize).toBe(24);
  });
});
