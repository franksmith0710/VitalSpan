import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/components/dashboard/DashboardListCardPreview", () => ({
  DashboardListCardPreview: () => <div data-testid="mock-preview" className="h-full" />,
}));
import {
  DashboardListCard,
  type DashboardListItem,
} from "@/components/dashboard/DashboardListCard";
import { DASHBOARD_LIST_CARD_ASPECT_RATIO } from "@/components/dashboard/DashboardPreviewThumb";

const tallCanvasDashboard: DashboardListItem = {
  id: "dash-tall",
  name: "高画布看板",
  slug: "dash-tall",
  updatedAt: "2026-07-14T12:00:00.000Z",
  layoutJson: {
    version: 2,
    canvas: { width: 1440, height: 4800 },
    widgets: [
      {
        id: "w1",
        type: "chart",
        title: "图表",
        order: 0,
        x: 100,
        y: 4200,
        width: 400,
        height: 300,
        chartConfig: {
          chartType: "bar",
          chartId: "w1",
          dataSourceId: "00000000-0000-4000-8000-000000000010",
          mode: "sql",
          sql: "SELECT 1",
        },
      },
    ],
    globalFilters: [],
  },
};

describe("DashboardListCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows official demo badge for demo slug dashboards", () => {
    const { getByText } = render(
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>
          <DashboardListCard
            dashboard={{
              id: "demo-1",
              name: "官方示例 · 双栏 KPI 分析",
              slug: "demo-dual-kpi",
              updatedAt: "2026-07-14T12:00:00.000Z",
              layoutJson: {
                version: 1,
                widgets: [],
                globalFilters: [],
                demoPackage: { seed: true, sourceTemplateKey: "builtin-dash-dual-kpi" },
              },
            }}
            canEdit
          />
        </MemoryRouter>
      </TooltipProvider>,
    );
    expect(getByText("官方示例")).toBeInTheDocument();
  });

  it("uses fixed list card aspect ratio regardless of canvas height", () => {
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>
          <DashboardListCard dashboard={tallCanvasDashboard} canEdit />
        </MemoryRouter>
      </TooltipProvider>,
    );

    const preview = container.querySelector("article > div");
    expect(preview).toHaveStyle({ aspectRatio: DASHBOARD_LIST_CARD_ASPECT_RATIO });
  });
});
