/**
 * Auto-layout for FlowCanvas. Adapted (and reduced to layered/LR) from ssota-labs
 * `ai-management/.../layout-engine.ts`. We only need: "if nodes already carry
 * coordinates, keep them; otherwise run ELK layered once to assign them."
 *
 * ELK is dynamically imported so it never enters the initial bundle.
 */

import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  type FlowModel,
  type FlowNodeData,
} from "./flow-model";

export type FlowLayoutDirection = "LR" | "RL" | "TB" | "BT";

/** `layered` = generic DAG (default); `tree` = ELK mrtree, ideal for org charts. */
export type FlowLayoutAlgorithm = "layered" | "tree";

export type Positioned = Record<string, { x: number; y: number }>;

const DEFAULT_SPACING = 56;

function nodeSize(n: FlowNodeData): { width: number; height: number } {
  return {
    width: n.width ?? DEFAULT_NODE_WIDTH,
    height: n.height ?? DEFAULT_NODE_HEIGHT,
  };
}

function toElkDirection(direction: FlowLayoutDirection): string {
  const map: Record<FlowLayoutDirection, string> = {
    LR: "RIGHT",
    RL: "LEFT",
    TB: "DOWN",
    BT: "UP",
  };
  return map[direction] ?? "RIGHT";
}

/** True when every node already has explicit x/y coordinates. */
export function hasExplicitCoords(model: FlowModel): boolean {
  return (
    model.nodes.length > 0 &&
    model.nodes.every((n) => typeof n.x === "number" && typeof n.y === "number")
  );
}

function explicitPositions(model: FlowModel): Positioned {
  const out: Positioned = {};
  for (const n of model.nodes) out[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
  return out;
}

/**
 * Compute positions for every node. Returns persisted coordinates as-is when all
 * nodes have them; otherwise runs ELK layered in the given direction.
 */
export async function layoutFlow(
  model: FlowModel,
  direction: FlowLayoutDirection = "LR",
  algorithm: FlowLayoutAlgorithm = "layered",
  spacing: number = DEFAULT_SPACING,
): Promise<Positioned> {
  if (model.nodes.length === 0) return {};
  if (hasExplicitCoords(model)) return explicitPositions(model);

  const Elk = (await import("elkjs/lib/elk.bundled.js")).default;
  const elk = new Elk();

  const children = model.nodes.map((n) => {
    const { width, height } = nodeSize(n);
    return { id: n.id, width, height };
  });
  const edges = model.edges.map((e, i) => ({
    id: `e${i}`,
    sources: [e.source],
    targets: [e.target],
  }));

  // `mrtree` gives the classic top-down org-chart look; `layered` is the generic
  // DAG default. Both honour `elk.direction` + node spacing.
  const elkAlgorithm = algorithm === "tree" ? "mrtree" : "layered";
  const laidOut = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": elkAlgorithm,
      "elk.direction": toElkDirection(direction),
      "elk.spacing.nodeNode": String(spacing),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(spacing + 24),
    },
    children,
    edges,
  });

  const positions: Positioned = {};
  for (const child of laidOut.children ?? []) {
    if (child.id && child.x != null && child.y != null) {
      positions[child.id] = { x: child.x, y: child.y };
    }
  }
  // Fallback for any node ELK dropped: stack it below origin.
  let fallbackY = 0;
  for (const n of model.nodes) {
    if (!positions[n.id]) {
      positions[n.id] = { x: 0, y: fallbackY };
      fallbackY += nodeSize(n).height + spacing;
    }
  }
  return positions;
}
