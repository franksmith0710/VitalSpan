import { describe, expect, it } from "vitest";
import {
  clampPackNodeToBounds,
  createPackPhysicsNodes,
  createPackPhysicsSimulation,
  enforcePackBounds,
  fitPackLayoutToPlot,
  focusPackNode,
  PACK_FOCUS_SCALE,
  packNodeVisualRadius,
  resetPackNodesToTarget,
  resolvePackEdgeInset,
  settlePackOverlaps,
} from "./circlePackingPhysics";

describe("circlePackingPhysics", () => {
  it("reserves inset for focus scale at plot edges", () => {
    expect(resolvePackEdgeInset(40, 1.5)).toBeGreaterThanOrEqual(8);
  });

  it("fits pack layout inside plot with margin", () => {
    const fitted = fitPackLayoutToPlot(
      [
        { name: "a", x: 80, y: 60, r: 20 },
        { name: "b", x: 120, y: 60, r: 16 },
      ],
      200,
      120,
      6,
    );
    const minX = Math.min(...fitted.map((d) => d.x - d.r));
    const maxX = Math.max(...fitted.map((d) => d.x + d.r));
    const minY = Math.min(...fitted.map((d) => d.y - d.r));
    const maxY = Math.max(...fitted.map((d) => d.y + d.r));
    expect(minX).toBeGreaterThanOrEqual(6);
    expect(minY).toBeGreaterThanOrEqual(6);
    expect(maxX).toBeLessThanOrEqual(194);
    expect(maxY).toBeLessThanOrEqual(114);
  });

  it("keeps enlarged nodes inside plot bounds", () => {
    const node = {
      name: "a",
      targetX: 4,
      targetY: 4,
      baseR: 12,
      focusScale: PACK_FOCUS_SCALE,
      x: -5,
      y: 90,
    };
    clampPackNodeToBounds(node, 120, 80, 1.5);
    expect(node.x).toBe(packNodeVisualRadius(node, 1.5));
    expect(node.y).toBe(80 - packNodeVisualRadius(node, 1.5));
  });

  it("pushes overlapping pack nodes apart", () => {
    const nodes = createPackPhysicsNodes([
      { name: "a", x: 50, y: 50, r: 16 },
      { name: "b", x: 52, y: 50, r: 16 },
    ]);
    const simulation = createPackPhysicsSimulation(nodes, 120, 80, 1.5);
    for (let i = 0; i < 90; i += 1) simulation.tick();
    simulation.stop();
    const dx = (nodes[0]!.x ?? 0) - (nodes[1]!.x ?? 0);
    const dy = (nodes[0]!.y ?? 0) - (nodes[1]!.y ?? 0);
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(30);
  });

  it("squeezes neighbors when hovered node enlarges in place", () => {
    const nodes = createPackPhysicsNodes([
      { name: "a", x: 50, y: 40, r: 18 },
      { name: "b", x: 82, y: 40, r: 18 },
      { name: "c", x: 114, y: 40, r: 18 },
    ]);
    const simulation = createPackPhysicsSimulation(nodes, 180, 80, 1.5);
    simulation.setInteraction("hover");
    focusPackNode(nodes[1]!);
    nodes[1]!.renderScale = PACK_FOCUS_SCALE;
    settlePackOverlaps(simulation, nodes, 180, 80, 1.5);
    expect(Math.abs((nodes[0]!.x ?? 0) - 50)).toBeGreaterThan(2);
    expect(Math.abs((nodes[2]!.x ?? 0) - 114)).toBeGreaterThan(2);
  });

  it("repeats squeeze on every hover cycle", () => {
    const nodes = createPackPhysicsNodes([
      { name: "a", x: 50, y: 40, r: 18 },
      { name: "b", x: 82, y: 40, r: 18 },
      { name: "c", x: 114, y: 40, r: 18 },
    ]);
    const simulation = createPackPhysicsSimulation(nodes, 180, 80, 1.5);

    const squeeze = () => {
      resetPackNodesToTarget(nodes);
      focusPackNode(nodes[1]!);
      nodes[1]!.renderScale = PACK_FOCUS_SCALE;
      simulation.setInteraction("hover");
      simulation.reheat();
      settlePackOverlaps(simulation, nodes, 180, 80, 1.5);
      return Math.abs((nodes[0]!.x ?? 0) - 50) + Math.abs((nodes[2]!.x ?? 0) - 114);
    };

    const first = squeeze();
    simulation.stop();
    const second = squeeze();
    expect(first).toBeGreaterThan(4);
    expect(second).toBeGreaterThan(4);
  });

  it("keeps nodes inside plot after hover squeeze", () => {
    const nodes = createPackPhysicsNodes([
      { name: "a", x: 8, y: 40, r: 18 },
      { name: "b", x: 40, y: 40, r: 18 },
      { name: "c", x: 72, y: 40, r: 18 },
    ]);
    const simulation = createPackPhysicsSimulation(nodes, 120, 80, 1.5);
    simulation.setInteraction("hover");
    focusPackNode(nodes[1]!);
    nodes[1]!.renderScale = PACK_FOCUS_SCALE;
    settlePackOverlaps(simulation, nodes, 120, 80, 1.5);
    for (const node of nodes) {
      const r = packNodeVisualRadius(node, 1.5);
      expect(node.x! - r).toBeGreaterThanOrEqual(0);
      expect(node.x! + r).toBeLessThanOrEqual(120);
      expect(node.y! - r).toBeGreaterThanOrEqual(0);
      expect(node.y! + r).toBeLessThanOrEqual(80);
    }
  });
});
