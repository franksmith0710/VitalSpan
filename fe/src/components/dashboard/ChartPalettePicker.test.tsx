import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartPalettePicker } from "./ChartPalettePicker";

afterEach(cleanup);

describe("ChartPalettePicker", () => {
  it("renders VitalSpan palette rows and supports inherit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChartPalettePicker showInherit value={undefined} onChange={onChange} />);

    expect(screen.getByRole("listbox", { name: "配色方案" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /跟随看板/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /^品牌$/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("option", { name: /政企/ })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /浅韵/ }));
    expect(onChange).toHaveBeenCalledWith("pastel", expect.any(Array));
  });
});
