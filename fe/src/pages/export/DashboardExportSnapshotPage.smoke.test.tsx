import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardExportSnapshotPage } from "./DashboardExportSnapshotPage";

vi.mock("@/lib/exportSnapshot", () => ({
  fetchExportLayout: vi.fn(),
}));

vi.mock("@/components/dashboard/DashboardLayoutPreview", () => ({
  DashboardLayoutPreview: () => <div data-testid="layout-preview">preview</div>,
}));

vi.mock("@/components/dashboard/screen/DataScreenPresenter", () => ({
  DataScreenPresenter: () => <div data-testid="screen-presenter">screen</div>,
}));

import { fetchExportLayout } from "@/lib/exportSnapshot";

describe("DashboardExportSnapshotPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows error when token missing", async () => {
    render(
      <MemoryRouter initialEntries={["/export/dashboard/d1"]}>
        <Routes>
          <Route path="/export/dashboard/:id" element={<DashboardExportSnapshotPage surface="dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("缺少 export token")).toBeInTheDocument();
  });

  it("loads layout when token present", async () => {
    vi.mocked(fetchExportLayout).mockResolvedValue({
      id: "d1",
      name: "Demo",
      surfaceKind: "dashboard",
      layoutJson: { version: 1, widgets: [], globalFilters: [] },
    });
    render(
      <MemoryRouter initialEntries={["/export/dashboard/d1?token=abc"]}>
        <Routes>
          <Route path="/export/dashboard/:id" element={<DashboardExportSnapshotPage surface="dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("layout-preview")).toBeInTheDocument();
    expect(document.querySelector("[data-export-snapshot]")).toBeTruthy();
    expect(document.querySelector("[data-dashboard-thumbnail-capture]")).toBeTruthy();
  });
});
