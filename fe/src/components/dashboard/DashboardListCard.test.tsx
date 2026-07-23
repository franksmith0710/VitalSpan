import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
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
      },
    ],
    globalFilters: [],
  },
};

describe("DashboardListCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses fixed list card aspect ratio regardless of canvas height", () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardListCard dashboard={tallCanvasDashboard} canEdit />
      </MemoryRouter>,
    );

    const preview = container.querySelector("article > div");
    expect(preview).toHaveStyle({ aspectRatio: DASHBOARD_LIST_CARD_ASPECT_RATIO });
  });
});
