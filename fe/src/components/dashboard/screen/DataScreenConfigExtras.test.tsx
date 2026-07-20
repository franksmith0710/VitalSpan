import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataScreenConfigExtras } from "./DataScreenConfigExtras";
import type { DashboardLayoutV2 } from "@/components/dashboard/layoutUtils";

afterEach(() => cleanup());

const baseLayout: DashboardLayoutV2 = {
  version: 2,
  canvas: { width: 2072, height: 1094 },
  widgets: [],
  globalFilters: [],
  styleConfig: { surfaceKind: "data-screen", colorScheme: "dark" },
};

describe("DataScreenConfigExtras canvas size", () => {
  it("commits width patch without stale height from closure", () => {
    const onCanvasSizeChange = vi.fn();
    render(
      <DataScreenConfigExtras
        layout={baseLayout}
        styleConfig={baseLayout.styleConfig!}
        widgets={[]}
        name="测试大屏"
        canSave
        presentationMode="fitWidth"
        onPresentationModeChange={vi.fn()}
        onCanvasSizeChange={onCanvasSizeChange}
      />,
    );

    const widthInput = screen.getByLabelText("W");
    fireEvent.change(widthInput, { target: { value: "1920" } });
    fireEvent.blur(widthInput);

    expect(onCanvasSizeChange).toHaveBeenCalledWith({ width: 1920 });
    expect(onCanvasSizeChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ height: expect.any(Number) }),
    );
  });

  it("applies 16:9 preset in one patch", () => {
    const onCanvasSizeChange = vi.fn();
    render(
      <DataScreenConfigExtras
        layout={baseLayout}
        styleConfig={baseLayout.styleConfig!}
        widgets={[]}
        name="测试大屏"
        canSave
        presentationMode="fitWidth"
        onPresentationModeChange={vi.fn()}
        onCanvasSizeChange={onCanvasSizeChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "1920×1080 (16:9)" }));
    expect(onCanvasSizeChange).toHaveBeenCalledWith({ width: 1920, height: 1080 });
  });
});
