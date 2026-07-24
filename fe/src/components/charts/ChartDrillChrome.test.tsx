import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChartDrillChrome } from "./ChartDrillChrome";

describe("ChartDrillChrome", () => {
  it("renders breadcrumb and handles navigation", () => {
    const onBack = vi.fn();
    const onReset = vi.fn();
    const onNavigate = vi.fn();

    render(
      <div className="dashboard-theme-scope" style={{ ["--dashboard-drill-level-0" as string]: "#465fff" }}>
        <ChartDrillChrome
          stack={[
            { field: "province", value: "浙江" },
            { field: "city", value: "杭州" },
          ]}
          onBack={onBack}
          onReset={onReset}
          onNavigate={onNavigate}
        />
      </div>,
    );

    expect(screen.getByText("全部")).toBeInTheDocument();
    expect(screen.getByText("浙江")).toBeInTheDocument();
    expect(screen.getByText("杭州")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("返回上一级"));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("重置钻取"));
    expect(onReset).toHaveBeenCalled();

    fireEvent.click(screen.getByText("浙江"));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("renders nothing when stack is empty", () => {
    const { container } = render(
      <ChartDrillChrome stack={[]} onBack={vi.fn()} onReset={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders inline notice without extra banner row", () => {
    render(
      <div className="dashboard-theme-scope">
        <ChartDrillChrome
          stack={[{ field: "province", value: "北京" }]}
          notice="已是最后一层"
          onBack={vi.fn()}
          onReset={vi.fn()}
          onNavigate={vi.fn()}
        />
      </div>,
    );

    expect(screen.getByText("已是最后一层")).toBeInTheDocument();
    expect(screen.getByText("已是最后一层").className).toMatch(/chart-drill-chrome__notice/);
  });
});
