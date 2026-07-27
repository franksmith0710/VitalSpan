import { describe, expect, it } from "vitest";
import {
  buildGeoBorderRingPath,
  sampleGeoBorderRing,
} from "./geoBorderFlowParticles";

describe("geoBorderFlowParticles", () => {
  it("samples a closed ring by normalized distance", () => {
    const path = buildGeoBorderRingPath([
      { ax: 0, ay: 0, bx: 2, by: 0 },
      { ax: 2, ay: 0, bx: 2, by: 1 },
      { ax: 2, ay: 1, bx: 0, by: 1 },
      { ax: 0, ay: 1, bx: 0, by: 0 },
    ]);
    expect(path.totalLength).toBeCloseTo(6, 5);

    const start = sampleGeoBorderRing(path, 0, 0);
    expect(start.x).toBeCloseTo(0, 5);
    expect(start.y).toBeCloseTo(0, 5);

    const corner = sampleGeoBorderRing(path, 2 / 6, 0);
    expect(corner.x).toBeCloseTo(2, 5);
    expect(corner.y).toBeCloseTo(0, 5);

    const loopEnd = sampleGeoBorderRing(path, 1, 0);
    expect(loopEnd.x).toBeCloseTo(start.x, 5);
    expect(loopEnd.y).toBeCloseTo(start.y, 5);
  });
});
