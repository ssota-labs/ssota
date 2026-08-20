/**
 * Auto-layout for FlowCanvas / ErdDiagram.
 *
 * - `layoutFlow` — ELK layered/mrtree (async), used by FlowCanvas·ERD
 * - `layoutFlowWithDagre` — React Flow 공식 Dagre 예제 패턴 (sync)
 *   @see https://reactflow.dev/examples/layout/dagre
 *   @see https://reactflow.dev/learn/layouting/layouting
 *
 * ELK is dynamically imported so it never enters the initial FlowCanvas bundle
 * path unless needed; dagre is a light sync dep.
 */

import dagre from "@dagrejs/dagre";
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
 * React Flow 공식 Dagre Tree 예제와 동일한 노드 배치.
 * 엣지 라우팅은 하지 않는다 — RF 내장 SmoothStep 등에 맡긴다.
 * @see https://reactflow.dev/examples/layout/dagre
 * @see https://reactflow.dev/learn/layouting/layouting#routing-edges
 */
export function layoutFlowWithDagre(
  model: FlowModel,
  direction: FlowLayoutDirection = "LR",
  spacing: number = DEFAULT_SPACING,
): Positioned {
  if (model.nodes.length === 0) return {};
  if (hasExplicitCoords(model)) return explicitPositions(model);

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: spacing,
    ranksep: spacing + 24,
    marginx: 0,
    marginy: 0,
  });

  const sizes = new Map(
    model.nodes.map((n) => {
      const size = nodeSize(n);
      return [n.id, size] as const;
    }),
  );

  for (const n of model.nodes) {
    const { width, height } = sizes.get(n.id)!;
    dagreGraph.setNode(n.id, { width, height });
  }
  for (const e of model.edges) {
    if (!sizes.has(e.source) || !sizes.has(e.target)) continue;
    dagreGraph.setEdge(e.source, e.target);
  }

  dagre.layout(dagreGraph);

  const positions: Positioned = {};
  for (const n of model.nodes) {
    const laid = dagreGraph.node(n.id);
    const { width, height } = sizes.get(n.id)!;
    // Dagre anchor = center; React Flow anchor = top-left (공식 예제와 동일).
    positions[n.id] = {
      x: (laid?.x ?? 0) - width / 2,
      y: (laid?.y ?? 0) - height / 2,
    };
  }
  return positions;
}

/**
 * ELK 로드/실행 실패 시(dev 청크 로드 실패 등) 사용할 저해상도 레이아웃:
 * 엣지 BFS 랭크를 열(column)로, 랭크 내 순서를 행으로 배치한다.
 */
function rankedFallbackPositions(
  model: FlowModel,
  direction: FlowLayoutDirection,
  spacing: number,
): Positioned {
  const incoming = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const n of model.nodes) incoming.set(n.id, 0);
  for (const e of model.edges) {
    if (!incoming.has(e.source) || !incoming.has(e.target)) continue;
    adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }
  const rank = new Map<string, number>();
  const queue = model.nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
  for (const id of queue) rank.set(id, 0);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of adjacency.get(cur) ?? []) {
      const candidate = (rank.get(cur) ?? 0) + 1;
      if (candidate > (rank.get(next) ?? 0) && candidate < model.nodes.length) {
        rank.set(next, candidate);
        queue.push(next);
      }
    }
  }
  const byRank = new Map<number, string[]>();
  for (const n of model.nodes) {
    const r = rank.get(n.id) ?? 0;
    byRank.set(r, [...(byRank.get(r) ?? []), n.id]);
  }
  const sizeById = new Map(model.nodes.map((n) => [n.id, nodeSize(n)]));
  const horizontal = direction === "LR" || direction === "RL";
  const positions: Positioned = {};
  for (const [r, ids] of byRank) {
    let cross = 0;
    for (const id of ids) {
      const { width, height } = sizeById.get(id)!;
      positions[id] = horizontal
        ? { x: r * (width + spacing + 24), y: cross }
        : { x: cross, y: r * (height + spacing + 24) };
      cross += (horizontal ? height : width) + spacing;
    }
  }
  return positions;
}

/**
 * Compute positions for every node. Returns persisted coordinates as-is when all
 * nodes have them; otherwise runs ELK layered in the given direction.
 * ELK 청크 로드가 실패해도 reject하지 않고 랭크 기반 폴백 좌표를 돌려준다 —
 * 레이아웃 실패가 캔버스 전체를 빈 화면으로 만들면 안 된다.
 */
export async function layoutFlow(
  model: FlowModel,
  direction: FlowLayoutDirection = "LR",
  algorithm: FlowLayoutAlgorithm = "layered",
  spacing: number = DEFAULT_SPACING,
): Promise<Positioned> {
  if (model.nodes.length === 0) return {};
  if (hasExplicitCoords(model)) return explicitPositions(model);

  let elk: InstanceType<Awaited<typeof import("elkjs/lib/elk.bundled.js")>["default"]>;
  try {
    const Elk = (await import("elkjs/lib/elk.bundled.js")).default;
    elk = new Elk();
  } catch (error) {
    console.error("[flow-layout] ELK load failed — ranked fallback 사용", error);
    return rankedFallbackPositions(model, direction, spacing);
  }

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
  let laidOut: Awaited<ReturnType<typeof elk.layout>>;
  try {
    laidOut = await elk.layout({
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
  } catch (error) {
    console.error("[flow-layout] ELK layout failed — ranked fallback 사용", error);
    return rankedFallbackPositions(model, direction, spacing);
  }

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
