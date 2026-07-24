import { describe, expect, it } from "vitest";
import { buildVizLayoutEnvelope } from "./dashboardTemplates";
import type { DashboardLayoutV1 } from "@/components/dashboard/layoutUtils";

describe("buildVizLayoutEnvelope", () => {
  it("wraps dashboard layout in viz-layout envelope", () => {
    const layout: DashboardLayoutV1 = {
      version: 1,
      widgets: [],
      globalFilters: [],
    };
    const envelope = buildVizLayoutEnvelope(layout, "双栏 KPI", "dashboard");
    expect(envelope.templateVersion).toBe(1);
    expect(envelope.kind).toBe("viz-layout");
    expect(envelope.surfaceKind).toBe("dashboard");
    expect(envelope.name).toBe("双栏 KPI");
    expect(envelope.layout).toEqual(layout);
  });
});
