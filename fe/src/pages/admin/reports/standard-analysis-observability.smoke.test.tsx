import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StandardAnalysisSnapshotStrip } from "./components/StandardAnalysisSnapshotStrip";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async (path: string) => {
    if (path.includes("/api/v1/reports/schedules")) {
      return {
        items: [
          {
            id: "sched-1",
            sourceType: "standard",
            sourceKey: "equipment-overview",
            status: "scheduled",
            cron: "0 8 * * *",
            timezone: "Asia/Shanghai",
            allowedActions: [],
          },
        ],
        total: 1,
      };
    }
    throw new Error(`unmocked ${path}`);
  }),
}));

const pack = {
  packKey: "equipment-overview",
  displayName: "设备标准分析",
  datasetId: "demo-dataset",
  fieldMapping: { status: "status", region: "region", createdAt: "created_at" },
  enabledThemes: ["lifecycle"],
  allowedRoles: ["admin"],
  snapshotCronPreset: "daily" as const,
  snapshotRetentionPeriods: 12,
};

describe("StandardAnalysisSnapshotStrip observability", () => {
  afterEach(() => cleanup());

  it("shows calibration, retention, and delivery summary", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TooltipProvider delayDuration={0}>
          <MemoryRouter>
            <StandardAnalysisSnapshotStrip
              pack={pack}
              activeTheme="lifecycle"
              snapshots={[
                {
                  packKey: pack.packKey,
                  theme: "lifecycle",
                  periodKind: "daily",
                  periodKey: "2026-08-19",
                  capturedAt: "2026-08-19T01:00:00Z",
                  renderSpec: { sections: [] },
                },
              ]}
              viewMode="live"
              canManage
              capturePending={false}
              onCapture={() => undefined}
            />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    const strip = await screen.findByTestId("standard-analysis-observability-strip");
    expect(strip).toHaveTextContent("口径");
    expect(strip).toHaveTextContent("保留最近 12 期");
    expect(strip).toHaveTextContent("2026-08-19");
    expect(await screen.findByTestId("standard-analysis-delivery-summary")).toHaveTextContent(
      "1 条已调度",
    );
  });
});
