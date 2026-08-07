import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAuthenticatedBlob } from "@/lib/apiUpload";
import { HubCardDashboardThumbnail } from "./HubCardDashboardThumbnail";

vi.mock("@/lib/apiUpload", () => ({
  fetchAuthenticatedBlob: vi.fn(),
}));

describe("HubCardDashboardThumbnail", () => {
  beforeEach(() => {
    vi.mocked(fetchAuthenticatedBlob).mockResolvedValue(new Blob(["img"], { type: "image/png" }));
    vi.stubGlobal(
      "URL",
      Object.assign(globalThis.URL, {
        createObjectURL: vi.fn(() => "blob:mock-thumb"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads authenticated thumbnail into an img element", async () => {
    render(
      <HubCardDashboardThumbnail thumbnailUrl="/api/v1/dashboards/d1/thumbnail?v=2" isDataScreen />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("hub-card-dashboard-thumbnail")).toBeInTheDocument();
    });
    expect(screen.getByTestId("hub-card-dashboard-thumbnail").getAttribute("src")).toMatch(/^blob:/);
  });
});
