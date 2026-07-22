import * as d3 from "d3";

/** 悬停放大倍率 */
export const PACK_FOCUS_SCALE = 1.18;

/** 半径插值速度（越大越快） */
export const PACK_SCALE_LERP = 0.32;

export type PackInteractionLevel = "idle" | "hover";

export function resolvePackEdgeInset(maxR: number, strokeWidth: number): number {
  return Math.ceil(maxR * (PACK_FOCUS_SCALE - 1) + strokeWidth + 1);
}

export type PackPhysicsNode = d3.SimulationNodeDatum & {
  name: string;
  targetX: number;
  targetY: number;
  baseR: number;
  /** 目标缩放 */
  focusScale: number;
  /** 当前渲染缩放（向 focusScale 平滑过渡） */
  renderScale: number;
};

export type PackPhysicsSimulation = d3.Simulation<PackPhysicsNode, undefined> & {
  setInteraction: (level: PackInteractionLevel) => void;
  reheat: () => void;
};

export function packNodeRadius(node: PackPhysicsNode): number {
  return node.baseR * node.renderScale;
}

export function packNodeVisualRadius(node: PackPhysicsNode, strokeWidth: number): number {
  return packNodeRadius(node) + strokeWidth / 2;
}

export function stepPackRenderScales(
  nodes: ReadonlyArray<PackPhysicsNode>,
  lerp = PACK_SCALE_LERP,
): void {
  for (const node of nodes) {
    const delta = node.focusScale - node.renderScale;
    if (Math.abs(delta) < 0.002) {
      node.renderScale = node.focusScale;
      continue;
    }
    node.renderScale += delta * lerp;
  }
}

export function fitPackLayoutToPlot(
  items: ReadonlyArray<{ name: string; x: number; y: number; r: number }>,
  plotW: number,
  plotH: number,
  margin: number,
): Array<{ name: string; x: number; y: number; r: number }> {
  if (items.length === 0) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    minX = Math.min(minX, item.x - item.r);
    maxX = Math.max(maxX, item.x + item.r);
    minY = Math.min(minY, item.y - item.r);
    maxY = Math.max(maxY, item.y + item.r);
  }

  const bboxW = Math.max(maxX - minX, 1);
  const bboxH = Math.max(maxY - minY, 1);
  const usableW = Math.max(1, plotW - margin * 2);
  const usableH = Math.max(1, plotH - margin * 2);
  const scale = Math.min(usableW / bboxW, usableH / bboxH);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return items.map((item) => ({
    name: item.name,
    x: (item.x - cx) * scale + plotW / 2,
    y: (item.y - cy) * scale + plotH / 2,
    r: item.r * scale,
  }));
}

function packNodeCollideRadius(node: PackPhysicsNode, strokeWidth: number): number {
  return packNodeVisualRadius(node, strokeWidth);
}

function resolveAnchorStrength(node: PackPhysicsNode, interaction: PackInteractionLevel): number {
  if (node.fx != null || node.fy != null) return 0;
  return interaction === "hover" ? 0.008 : 0.045;
}

export function clampPackNodeToBounds(
  node: PackPhysicsNode,
  width: number,
  height: number,
  strokeWidth: number,
): void {
  const r = packNodeVisualRadius(node, strokeWidth);
  let x = node.x ?? node.targetX;
  let y = node.y ?? node.targetY;
  const vx = node.vx ?? 0;
  const vy = node.vy ?? 0;

  if (x < r) {
    x = r;
    node.vx = Math.abs(vx) * 0.45;
  } else if (x > width - r) {
    x = width - r;
    node.vx = -Math.abs(vx) * 0.45;
  }

  if (y < r) {
    y = r;
    node.vy = Math.abs(vy) * 0.45;
  } else if (y > height - r) {
    y = height - r;
    node.vy = -Math.abs(vy) * 0.45;
  }

  node.x = Math.max(r, Math.min(width - r, x));
  node.y = Math.max(r, Math.min(height - r, y));
}

export function createPackBoundaryForce(
  width: number,
  height: number,
  strokeWidth: number,
): d3.Force<PackPhysicsNode, undefined> {
  let nodes: PackPhysicsNode[] = [];

  function force(alpha: number) {
    const push = 1.1 * alpha;
    for (const node of nodes) {
      const r = packNodeVisualRadius(node, strokeWidth);
      const x = node.x ?? node.targetX;
      const y = node.y ?? node.targetY;

      if (x < r) node.vx = (node.vx ?? 0) + (r - x) * push * 8;
      else if (x > width - r) node.vx = (node.vx ?? 0) - (x - (width - r)) * push * 8;

      if (y < r) node.vy = (node.vy ?? 0) + (r - y) * push * 8;
      else if (y > height - r) node.vy = (node.vy ?? 0) - (y - (height - r)) * push * 8;
    }
  }

  force.initialize = (next: PackPhysicsNode[]) => {
    nodes = next;
  };

  return force;
}

export function enforcePackBounds(
  nodes: ReadonlyArray<PackPhysicsNode>,
  width: number,
  height: number,
  strokeWidth: number,
): void {
  for (const node of nodes) clampPackNodeToBounds(node, width, height, strokeWidth);
}

export function createPackPhysicsNodes(
  items: ReadonlyArray<{ name: string; x: number; y: number; r: number }>,
): PackPhysicsNode[] {
  return items.map((item) => ({
    name: item.name,
    targetX: item.x,
    targetY: item.y,
    baseR: item.r,
    focusScale: 1,
    renderScale: 1,
    x: item.x,
    y: item.y,
    vx: 0,
    vy: 0,
  }));
}

export function resetPackNodesToTarget(nodes: ReadonlyArray<PackPhysicsNode>): void {
  for (const node of nodes) {
    blurPackNode(node);
    node.renderScale = 1;
    node.x = node.targetX;
    node.y = node.targetY;
    node.vx = 0;
    node.vy = 0;
  }
}

/** 悬停：固定当前圆心，仅放大半径 */
export function focusPackNode(node: PackPhysicsNode): void {
  node.focusScale = PACK_FOCUS_SCALE;
  node.fx = node.x ?? node.targetX;
  node.fy = node.y ?? node.targetY;
}

export function blurPackNode(node: PackPhysicsNode): void {
  node.focusScale = 1;
  node.fx = null;
  node.fy = null;
}

/** 测试用：同步消除重叠 */
export function settlePackOverlaps(
  simulation: d3.Simulation<PackPhysicsNode, undefined>,
  nodes: PackPhysicsNode[],
  width: number,
  height: number,
  strokeWidth: number,
  ticks = 36,
): void {
  simulation.alpha(1);
  for (let i = 0; i < ticks; i += 1) {
    stepPackRenderScales(nodes, 1);
    simulation.tick();
  }
  enforcePackBounds(nodes, width, height, strokeWidth);
}

export function createPackPhysicsSimulation(
  nodes: PackPhysicsNode[],
  width: number,
  height: number,
  strokeWidth: number,
): PackPhysicsSimulation {
  let interaction: PackInteractionLevel = "idle";

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "x",
      d3.forceX<PackPhysicsNode>((d) => d.targetX).strength((d) => resolveAnchorStrength(d, interaction)),
    )
    .force(
      "y",
      d3.forceY<PackPhysicsNode>((d) => d.targetY).strength((d) => resolveAnchorStrength(d, interaction)),
    )
    .force(
      "collide",
      d3
        .forceCollide<PackPhysicsNode>((d) => packNodeCollideRadius(d, strokeWidth))
        .strength(0.92)
        .iterations(8),
    )
    .force("bounds", createPackBoundaryForce(width, height, strokeWidth))
    .velocityDecay(0.28)
    .alphaDecay(0.014)
    .alphaMin(0.001) as PackPhysicsSimulation;

  simulation.on("tick", () => {
    stepPackRenderScales(nodes);
    enforcePackBounds(nodes, width, height, strokeWidth);
  });

  simulation.setInteraction = (level: PackInteractionLevel) => {
    interaction = level;
    simulation.velocityDecay(level === "hover" ? 0.26 : 0.3);
    simulation
      .force(
        "x",
        d3.forceX<PackPhysicsNode>((d) => d.targetX).strength((d) => resolveAnchorStrength(d, interaction)),
      )
      .force(
        "y",
        d3.forceY<PackPhysicsNode>((d) => d.targetY).strength((d) => resolveAnchorStrength(d, interaction)),
      );
  };

  simulation.reheat = () => {
    simulation.force(
      "collide",
      d3
        .forceCollide<PackPhysicsNode>((d) => packNodeCollideRadius(d, strokeWidth))
        .strength(0.92)
        .iterations(8),
    );
    simulation.force("bounds", createPackBoundaryForce(width, height, strokeWidth));
    simulation.alpha(0.72).alphaTarget(0.3).restart();
  };

  return simulation;
}
