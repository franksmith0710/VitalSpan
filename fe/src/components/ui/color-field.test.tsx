import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    vi.useRealTimers();
  });

  async function openPicker(label: string) {
    fireEvent.click(screen.getByLabelText(`${label}取色器`));
    return waitFor(() => {
      expect(screen.getByLabelText("hex-color-picker")).toBeInTheDocument();
    });
  }

  it("debounces color picker commits", async () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="画布底色" />);
    await openPicker("画布底色");
    const picker = screen.getByLabelText("hex-color-picker");

    fireEvent.change(picker, { target: { value: "#111111" } });
    fireEvent.change(picker, { target: { value: "#7e4a44" } });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#7e4a44");
  });

  it("flushes pending color when popover closes", async () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="主题色" />);
    await openPicker("主题色");
    const picker = screen.getByLabelText("hex-color-picker");

    fireEvent.change(picker, { target: { value: "#465fff" } });
    fireEvent.click(screen.getByLabelText("主题色取色器"));

    expect(onChange).toHaveBeenCalledWith("#465fff");
  });
});
