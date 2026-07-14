import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorField } from "./color-field";

describe("ColorField", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces native color picker commits", () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="画布底色" />);
    const picker = screen.getByLabelText("画布底色取色器");

    fireEvent.input(picker, { target: { value: "#111111" } });
    fireEvent.input(picker, { target: { value: "#7e4a44" } });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#7e4a44");
  });

  it("flushes pending color on picker blur", () => {
    const onChange = vi.fn();
    render(<ColorField value="#ffffff" onChange={onChange} label="主题色" />);
    const picker = screen.getByLabelText("主题色取色器");

    fireEvent.input(picker, { target: { value: "#465fff" } });
    fireEvent.blur(picker);

    expect(onChange).toHaveBeenCalledWith("#465fff");
  });
});
