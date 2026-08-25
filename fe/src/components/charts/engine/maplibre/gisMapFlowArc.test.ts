import { describe, expect, it } from "vitest";
import {
  DEFAULT_FLOW_ARC_LIFT,
  interpolateElevatedFlowArc,
  interpolateGreatCircleArc,
} from "@/components/charts/engine/maplibre/gisMapFlowArc";

describe("gisMapFlowArc", () => {
  it("elevated arc bulges above the great circle midpoint", () => {
    const flat = interpolateGreatCircleArc(121.47, 31.23, -118.24, 34.05, 32);
    const lifted = interpolateElevatedFlowArc(
      121.47,
      31.23,
      -118.24,
      34.05,
      32,
      DEFAULT_FLOW_ARC_LIFT,
    );
    const midFlat = flat[16]!;
    const midLift = lifted[16]!;
    const deviation =
      Math.abs(midLift[0] - midFlat[0]) + Math.abs(midLift[1] - midFlat[1]);
    expect(deviation).toBeGreaterThan(0.5);
    expect(lifted[0]?.[0]).toBeCloseTo(flat[0]![0]!, 2);
    expect(lifted[0]?.[1]).toBeCloseTo(flat[0]![1]!, 2);
    expect(lifted[lifted.length - 1]?.[0]).toBeCloseTo(flat[flat.length - 1]![0]!, 2);
    expect(lifted[lifted.length - 1]?.[1]).toBeCloseTo(flat[flat.length - 1]![1]!, 2);
  });
});
