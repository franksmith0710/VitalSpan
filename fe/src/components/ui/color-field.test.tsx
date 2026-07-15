import { CANVAS_BG_RECOMMENDED } from "@/components/dashboard/dashboardStyleConfig";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorField } from "./color-field";

vi.mock("react-colorful", () => ({
  HexColorPicker: ({
    color,
    onChange,
  }: {
    color: string;
    onChange: (value: string) => void;
  }) => (
    <input
      type="color"
      aria-label="hex-color-picker"
      value={color}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe("ColorField", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("debounces hex input commits", () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="画布底色" />);
    const input = screen.getByPlaceholderText("#ffffff");

    fireEvent.change(input, { target: { value: "#111111" } });
    fireEvent.change(input, { target: { value: "#7e4a44" } });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#7e4a44");
  });

  it("flushes pending color when popover closes", () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="主题色" />);
    fireEvent.click(screen.getByLabelText("主题色取色器"));
    const picker = screen.getByLabelText("hex-color-picker");

    fireEvent.change(picker, { target: { value: "#465fff" } });
    fireEvent.click(screen.getByLabelText("主题色取色器"));

    expect(onChange).toHaveBeenCalledWith("#465fff");
  });

  it("commits picker changes immediately while popover is open", () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="背景色" />);
    fireEvent.click(screen.getByLabelText("背景色取色器"));
    const picker = screen.getByLabelText("hex-color-picker");

    fireEvent.change(picker, { target: { value: "#43b379" } });

    expect(onChange).toHaveBeenCalledWith("#43b379");
  });

  it("does not commit partial hex while typing", () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="边框色" />);
    const input = screen.getByLabelText("边框色 Hex");

    fireEvent.change(input, { target: { value: "#43" } });
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders recommended swatches in a grid with labels", () => {
    const onChange = vi.fn();
    render(
      <ColorField
        value="#ffffff"
        onChange={onChange}
        label="画布底色"
        swatches={CANVAS_BG_RECOMMENDED}
      />,
    );
    fireEvent.click(screen.getByLabelText("画布底色取色器"));

    expect(screen.getByRole("listbox", { name: "画布底色推荐色" })).toHaveClass("grid");
    expect(screen.getByRole("option", { name: "纯白" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "墨蓝" })).toBeInTheDocument();
  });
});
