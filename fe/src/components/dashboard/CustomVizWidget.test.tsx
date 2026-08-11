import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CustomVizWidget } from "./CustomVizWidget";
import { coerceLayoutWidget } from "./layoutUtils";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async () => ({
    ok: true,
    text: async () => "<!DOCTYPE html><html><body>custom</body></html>",
  })),
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

  it("renders iframe srcDoc from artifact entry", async () => {
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
      expect(screen.getByTitle("AI")).toBeInTheDocument();
    });
  });
});
