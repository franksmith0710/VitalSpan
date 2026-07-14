import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardLayoutV2 } from "@/components/dashboard/layoutUtils";
import { DashboardListCardPreview } from "./DashboardListCardPreview";

vi.mock("./DashboardLayoutPreview", () => ({
  DashboardLayoutPreview: () => <div data-testid="dashboard-layout-preview-mock">preview</div>,
}));

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }

  disconnect() {}
  unobserve() {}
}

const sampleLayout: DashboardLayoutV2 = {
  version: 2,
  canvas: { width: 1440, height: 900 },
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
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows empty icon when dashboard has no widgets", () => {
    const { container } = render(
      <DashboardListCardPreview layoutJson={{ version: 2, canvas: { width: 1440, height: 900 }, widgets: [], globalFilters: [] }} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-list-card-preview")).not.toBeInTheDocument();
  });

  it("mounts real layout preview after entering viewport", async () => {
    render(<DashboardListCardPreview layoutJson={sampleLayout} />);
    expect(screen.getByTestId("dashboard-list-card-preview")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-layout-preview-mock")).toBeInTheDocument();
    });
  });
});
