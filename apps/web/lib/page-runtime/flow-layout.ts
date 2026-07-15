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

/** ELK orthogonal edge route — bend points in the same coordinate space as node positions. */
export type RoutedEdge = {
  id: string;
  points: Array<{ x: number; y: number }>;
};

export type LayoutWithEdges = {
  positions: Positioned;
  edges: RoutedEdge[];
};

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

function collectElkEdgePoints(
  edge: {
    id?: string;
    sections?: Array<{
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      bendPoints?: Array<{ x: number; y: number }>;
    }>;
  },
): RoutedEdge | null {
  if (!edge.id || !edge.sections || edge.sections.length === 0) return null;
  const points: Array<{ x: number; y: number }> = [];
  for (const section of edge.sections) {
    points.push(section.startPoint);
    for (const bend of section.bendPoints ?? []) points.push(bend);
    points.push(section.endPoint);
  }
  if (points.length < 2) return null;
  return { id: edge.id, points };
}

/**
 * Node positions + orthogonal edge routes from one ELK layered pass.
 * Feedback/cycle edges are included — ELK reverses them for ranking and still
 * returns non-overlapping orthogonal sections. On ELK failure, positions fall
 * back to ranked layout and `edges` is empty (caller should path locally).
 */
export async function layoutFlowWithEdges(
  model: FlowModel,
  direction: FlowLayoutDirection = "LR",
  spacing: number = DEFAULT_SPACING,
): Promise<LayoutWithEdges> {
  if (model.nodes.length === 0) return { positions: {}, edges: [] };
  // Persisted coords: keep them; routing needs a fresh ELK pass the caller can
  // request separately. Work-cycle always omits explicit coords.
  if (hasExplicitCoords(model)) {
    return { positions: explicitPositions(model), edges: [] };
  }

  let elk: InstanceType<Awaited<typeof import("elkjs/lib/elk.bundled.js")>["default"]>;
  try {
    const Elk = (await import("elkjs/lib/elk.bundled.js")).default;
    elk = new Elk();
  } catch (error) {
    console.error("[flow-layout] ELK load failed — ranked fallback 사용", error);
    return {
      positions: rankedFallbackPositions(model, direction, spacing),
      edges: [],
    };
  }

  const children = model.nodes.map((n) => {
    const { width, height } = nodeSize(n);
    return { id: n.id, width, height };
  });
  const edges = model.edges.map((e) => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }));

  let laidOut: Awaited<ReturnType<typeof elk.layout>>;
  try {
    laidOut = await elk.layout({
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": toElkDirection(direction),
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.spacing.nodeNode": String(spacing),
        "elk.spacing.edgeEdge": String(Math.max(12, Math.round(spacing / 3))),
        "elk.spacing.edgeNode": String(Math.max(16, Math.round(spacing / 2))),
        "elk.layered.spacing.nodeNodeBetweenLayers": String(spacing + 32),
        "elk.layered.spacing.edgeNodeBetweenLayers": String(
          Math.max(20, Math.round(spacing / 2)),
        ),
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        "elk.layered.unnecessaryBendpoints": "true",
      },
      children,
      edges,
    });
  } catch (error) {
    console.error("[flow-layout] ELK layout failed — ranked fallback 사용", error);
    return {
      positions: rankedFallbackPositions(model, direction, spacing),
      edges: [],
    };
  }

  const positions: Positioned = {};
  for (const child of laidOut.children ?? []) {
    if (child.id && child.x != null && child.y != null) {
      positions[child.id] = { x: child.x, y: child.y };
    }
  }
  let fallbackY = 0;
  for (const n of model.nodes) {
    if (!positions[n.id]) {
      positions[n.id] = { x: 0, y: fallbackY };
      fallbackY += nodeSize(n).height + spacing;
    }
  }

  const routed: RoutedEdge[] = [];
  for (const edge of laidOut.edges ?? []) {
    const route = collectElkEdgePoints(edge);
    if (route) routed.push(route);
  }

  const sized = model.nodes.map((n) => {
    const { width, height } = nodeSize(n);
    const p = positions[n.id] ?? { x: 0, y: 0 };
    return { id: n.id, x: p.x, y: p.y, width, height };
  });
  const edgeEnds = model.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
  return {
    positions,
    edges: redistributeSidePortsWithinNodes(sized, edgeEnds, routed),
  };
}

export type FeedbackRouteNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const PORT_SIDE_TOLERANCE = 2;

type Side = "west" | "east" | "north" | "south";

function sideOfPoint(
  node: FeedbackRouteNode,
  point: { x: number; y: number },
): Side | null {
  const left = node.x;
  const right = node.x + node.width;
  const top = node.y;
  const bottom = node.y + node.height;
  const onWest = Math.abs(point.x - left) <= PORT_SIDE_TOLERANCE;
  const onEast = Math.abs(point.x - right) <= PORT_SIDE_TOLERANCE;
  const onNorth = Math.abs(point.y - top) <= PORT_SIDE_TOLERANCE;
  const onSouth = Math.abs(point.y - bottom) <= PORT_SIDE_TOLERANCE;
  // Prefer LR sides for LR layouts — corners count as west/east.
  if (onWest) return "west";
  if (onEast) return "east";
  if (onNorth) return "north";
  if (onSouth) return "south";
  return null;
}

/** Shift an endpoint Y and drag the collinear horizontal stub with it. */
function setEndpointY(
  points: Array<{ x: number; y: number }>,
  endIndex: 0 | "last",
  newY: number,
): void {
  const idx = endIndex === 0 ? 0 : points.length - 1;
  const pt = points[idx];
  if (!pt) return;
  const oldY = pt.y;
  if (Math.abs(oldY - newY) < 0.01) return;
  points[idx] = { x: pt.x, y: newY };
  if (endIndex === 0) {
    for (let i = 1; i < points.length; i++) {
      const cur = points[i]!;
      const prev = points[i - 1]!;
      if (Math.abs(cur.y - oldY) > 0.5) break;
      // Stay on the horizontal run leaving the node.
      if (Math.abs(cur.x - prev.x) < 0.5) break;
      points[i] = { x: cur.x, y: newY };
    }
  } else {
    for (let i = points.length - 2; i >= 0; i--) {
      const cur = points[i]!;
      const next = points[i + 1]!;
      if (Math.abs(cur.y - oldY) > 0.5) break;
      if (Math.abs(cur.x - next.x) < 0.5) break;
      points[i] = { x: cur.x, y: newY };
    }
  }
}

/**
 * ELK spreads ports along a side (나열) — keep that ordering, but force every
 * attachment Y into `[node.y+inset, node.y+height-inset]` so stubs never poke
 * past the card. Multiple ports on one side are re-spaced evenly inside that band.
 */
export function redistributeSidePortsWithinNodes(
  nodes: FeedbackRouteNode[],
  edges: Array<{ id: string; source: string; target: string }>,
  routes: RoutedEdge[],
  inset: number = 10,
): RoutedEdge[] {
  if (routes.length === 0) return routes;
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const routeById = new Map(
    routes.map((r) => [r.id, { id: r.id, points: r.points.map((p) => ({ ...p })) }]),
  );

  type PortRef = {
    edgeId: string;
    end: 0 | "last";
    y: number;
  };

  const buckets = new Map<string, PortRef[]>();
  const bucketKey = (nodeId: string, side: Side) => `${nodeId}::${side}`;

  for (const e of edges) {
    const route = routeById.get(e.id);
    if (!route || route.points.length < 2) continue;
    const start = route.points[0]!;
    const end = route.points[route.points.length - 1]!;
    const source = nodesById.get(e.source);
    const target = nodesById.get(e.target);
    if (source) {
      const side = sideOfPoint(source, start);
      if (side === "west" || side === "east") {
        const key = bucketKey(e.source, side);
        const list = buckets.get(key) ?? [];
        list.push({ edgeId: e.id, end: 0, y: start.y });
        buckets.set(key, list);
      }
    }
    if (target) {
      const side = sideOfPoint(target, end);
      if (side === "west" || side === "east") {
        const key = bucketKey(e.target, side);
        const list = buckets.get(key) ?? [];
        list.push({ edgeId: e.id, end: "last", y: end.y });
        buckets.set(key, list);
      }
    }
  }

  for (const [key, ports] of buckets) {
    const nodeId = key.slice(0, key.indexOf("::"));
    const node = nodesById.get(nodeId);
    if (!node) continue;
    const top = node.y + inset;
    const bottom = node.y + node.height - inset;
    if (bottom <= top) {
      // Tiny node — pin everything to center.
      const mid = node.y + node.height / 2;
      for (const port of ports) {
        const route = routeById.get(port.edgeId);
        if (route) setEndpointY(route.points, port.end, mid);
      }
      continue;
    }
    const ordered = [...ports].toSorted((a, b) => a.y - b.y);
    const n = ordered.length;
    for (let i = 0; i < n; i++) {
      const y =
        n === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (n - 1);
      const port = ordered[i]!;
      const route = routeById.get(port.edgeId);
      if (route) setEndpointY(route.points, port.end, y);
    }
  }

  return [...routeById.values()];
}

/**
 * Orthogonal feedback corridors under already-placed nodes.
 * ELK INTERACTIVE re-ranks when cycles are present, so back-edges are routed
 * here instead: each edge gets its own lane below `baseY` (or the nodes' max
 * bottom if omitted).
 */
export function synthesizeFeedbackRoutes(
  nodesById: Map<string, FeedbackRouteNode>,
  edges: Array<{ id: string; source: string; target: string }>,
  options?: { baseY?: number; laneGap?: number; pad?: number },
): RoutedEdge[] {
  const laneGap = options?.laneGap ?? 20;
  const pad = options?.pad ?? 28;
  let maxBottom = 0;
  for (const n of nodesById.values()) {
    maxBottom = Math.max(maxBottom, n.y + n.height);
  }
  const baseY = options?.baseY ?? maxBottom + pad;
  const routed: RoutedEdge[] = [];
  edges.forEach((e, i) => {
    const s = nodesById.get(e.source);
    const t = nodesById.get(e.target);
    if (!s || !t) return;
    const sx = s.x + s.width / 2;
    const sy = s.y + s.height;
    const tx = t.x + t.width / 2;
    const ty = t.y + t.height;
    const laneY = baseY + i * laneGap;
    routed.push({
      id: e.id,
      points: [
        { x: sx, y: sy },
        { x: sx, y: laneY },
        { x: tx, y: laneY },
        { x: tx, y: ty },
      ],
    });
  });
  return routed;
}
