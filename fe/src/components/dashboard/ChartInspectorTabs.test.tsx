import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChartInspectorTabs } from "./ChartInspectorTabs";

afterEach(() => cleanup());

describe("ChartInspectorTabs scroll", () => {
  it("uses h-0 flex scroll panel for tab content", () => {
    const { container } = render(
      <div className="flex h-[280px] min-h-0 flex-col overflow-hidden">
        <ChartInspectorTabs
          className="min-h-0 flex-1"
          tabs={["data", "style"]}
          data={<div style={{ height: 1200 }}>tall-data</div>}
          style={<div>style</div>}
        />
      </div>,
    );

    const panel = container.querySelector(".overflow-y-auto");
    expect(panel).toBeTruthy();
    expect(panel).toHaveClass("h-0");
    expect(panel).not.toHaveClass("touch-pan-y");
    expect(container.querySelector('[class*="h-0"][class*="flex-1"][class*="overflow-hidden"]')).toBeTruthy();
  });
});
