import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CustomVizWidget } from "./CustomVizWidget";
import { rewriteBundleCss } from "./customVizHost";
import { coerceLayoutWidget } from "./layoutUtils";

vi.mock("@/lib/api", () => ({
  fetchWithTimeout: vi.fn(async () => ({
    ok: true,
    text: async () => "<!DOCTYPE html><html><body><p>custom</p></body></html>",
  })),
  getAuthHeaders: () => ({}),
}));

vi.mock("@/lib/appBasePath", () => ({
  resolveApiBaseUrl: () => "http://localhost:8000",
}));

describe("CustomVizWidget", () => {
  it("coerces customViz widget type", () => {
    const w = coerceLayoutWidget({
      id: "w1",
      type: "customViz",
      customVizConfig: { artifactId: "a1", dataBinding: { status: "manual" } },
    });
    expect(w.type).toBe("customViz");
    expect(w.customVizConfig?.artifactId).toBe("a1");
  });

  it("mounts artifact HTML into the host Base", async () => {
    render(
      <CustomVizWidget
        widget={{
          id: "w1",
          type: "customViz",
          title: "AI",
          colSpan: 6,
          rowSpan: 3,
          order: 0,
          customVizConfig: { artifactId: "550e8400-e29b-41d4-a716-446655440000" },
        }}
        mode="view"
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("custom-viz-host")).toBeInTheDocument();
    });
    expect(screen.getByText("custom")).toBeInTheDocument();
    expect(screen.queryByTitle("AI")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom-viz-host")).toHaveClass("vs-custom-viz-host");
  });

  it("scopes bundle html/body css to the host", () => {
    expect(rewriteBundleCss("html,body{margin:0}#root{padding:8px}")).toBe(
      ".vs-custom-viz-host, .vs-custom-viz-host{margin:0}.vs-custom-viz-host #root{padding:8px}",
    );
  });
});
