import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartDeSliderField, DeProgressSlider } from "./deAttrSlider";

afterEach(cleanup);

describe("ChartDeSliderField", () => {
  it("renders range slider and emits value on change", () => {
    const onChange = vi.fn();
    render(
      <ChartDeSliderField
        label="不透明度 %"
        value={80}
        min={0}
        max={100}
        unit="%"
        onChange={onChange}
      />,
    );

    expect(screen.getByText("不透明度 %")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "不透明度 %" });
    expect(slider).toHaveValue("80");

    fireEvent.change(slider, { target: { value: "40" } });
    expect(onChange).toHaveBeenCalledWith(40);
  });

  it("renders filled progress track proportional to value", () => {
    const { container } = render(
      <DeProgressSlider
        value={50}
        min={0}
        max={100}
        step={1}
        ariaLabel="测试滑块"
        onChange={vi.fn()}
      />,
    );

    const fill = container.querySelector("[aria-hidden].overflow-hidden > div");
    expect(fill).toHaveStyle({ width: "50%" });
  });

  it("uses fallback when value is undefined", () => {
    render(
      <ChartDeSliderField
        label="字号"
        value={undefined}
        fallback={18}
        min={10}
        max={48}
        unit="px"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("18px")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "字号" })).toHaveValue("18");
  });
});
