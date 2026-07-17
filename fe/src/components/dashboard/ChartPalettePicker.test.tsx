import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartPalettePicker } from "./ChartPalettePicker";

afterEach(cleanup);

describe("ChartPalettePicker", () => {
  it("renders DE-style select with swatch strip and preset options", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChartPalettePicker showInherit value={undefined} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "配色方案" })).toBeInTheDocument();
    expect(screen.getByText("默认")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自定义配色" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "配色方案" }));
    expect(screen.getByRole("menuitem", { name: /浅韵/ })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /浅韵/ }));
    expect(onChange).toHaveBeenCalledWith("pastel", expect.any(Array));
  });

  it("renders series color rows for bar chart metrics", async () => {
    const user = userEvent.setup();
    render(
      <ChartPalettePicker
        value="default"
        seriesColors={[{ id: "amount", name: "amount", color: "#465fff" }]}
        onChange={vi.fn()}
        onSeriesColorsChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "自定义配色" }));
    expect(screen.getByText("amount")).toBeInTheDocument();
    expect(screen.queryByLabelText("系列色 1")).not.toBeInTheDocument();
  });

  it("switches from inherit to default when opening custom colors", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChartPalettePicker showInherit value={undefined} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "自定义配色" }));
    expect(onChange).toHaveBeenCalledWith("default", expect.arrayContaining(["#465fff"]));
    expect(screen.getByTestId("chart-palette-custom")).toBeInTheDocument();
  });

  it("opens custom palette editor and resets to preset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChartPalettePicker
        value="default"
        paletteColors={["#465fff", "#ff0000"]}
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId("chart-palette-custom")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重置" }));
    expect(onChange).toHaveBeenCalledWith("default", expect.arrayContaining(["#465fff"]));
  });
});
