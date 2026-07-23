import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DashboardLayoutV2 } from "@/components/dashboard/layoutUtils";
import { DashboardListCardPreview } from "./DashboardListCardPreview";

const sampleLayout: DashboardLayoutV2 = {
  version: 2,
  canvas: { width: 1920, height: 1080 },
  styleConfig: { surfaceKind: "data-screen" },
  widgets: [
    {
      id: "w1",
      type: "chart",
      title: "图表",
      order: 0,
      x: 100,
      y: 80,
      width: 600,
      height: 360,
    },
  ],
  globalFilters: [],
};

describe("DashboardListCardPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows empty icon when dashboard has no widgets", () => {
    const { container } = render(
      <DashboardListCardPreview
        layoutJson={{ version: 2, canvas: { width: 1440, height: 900 }, widgets: [], globalFilters: [] }}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByTestId("dashboard-list-card-preview")).toBeInTheDocument();
  });

  it("renders static wireframe thumb without chart engine", () => {
    render(<DashboardListCardPreview layoutJson={sampleLayout} />);
    expect(screen.getByTestId("dashboard-list-card-preview")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-preview-thumb")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-preview-widget-w1")).toBeInTheDocument();
  });
});
