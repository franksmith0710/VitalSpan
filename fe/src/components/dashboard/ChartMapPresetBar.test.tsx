import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChartMapPresetBar } from "./ChartMapPresetBar";
import { DEMO_MAP_SALES_DRILL_SQL } from "@/lib/mapChartDataHint";

const onChange = vi.fn();

vi.mock("./chartInspectorContext", () => ({
  useChartInspector: () => ({
    cfg: { chartType: "map", dimensions: [], metrics: [] },
    onChange,
  }),
}));

describe("ChartMapPresetBar", () => {
  it("applies sales drill preset on click", async () => {
    const user = userEvent.setup();
    render(<ChartMapPresetBar />);
    await user.click(screen.getByRole("button", { name: /省→市→区县 · 演示库 sales/ }));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)?.[0];
    expect(next.sql).toBe(DEMO_MAP_SALES_DRILL_SQL);
    expect(next.dimensions?.map((d: { field: string }) => d.field)).toEqual([
      "province",
      "city",
      "district",
    ]);
  });
});
