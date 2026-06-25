/**
 * Flow graph model + manifest resolution for the `FlowCanvas` catalog component.
 * Domain-agnostic: a single node carries the whole graph (nodes + edges +
 * coordinates) in one jsonb property — same single-node-jsonb pattern as the
 * Spreadsheet component (`sheet-grid.ts`'s `coerceGrid`).
 *
 * The `nodePresentation` manifest is the bridge to the node catalog: rules match
 * a flow node by its `nodeType` (or a property value) and assign a visual variant
 * (color/shape/which property holds the title/badge). The generic FlowNode never
 * hardcodes domain concepts — it just applies the resolved variant.
 */

import { asColorToken, type FlowColorToken } from "./flow-tokens";

export type FlowNodeStatus = "loading" | "success" | "error";

export type FlowNodeData = {
  id: string;
  /** Catalog/domain node type — matched by manifest rules. Optional. */
  nodeType?: string;
  title: string;
  /** Optional persisted coordinates. Absent → auto-layout assigns them. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Arbitrary node properties (read by manifest `titleFrom`/`badgeFrom`/`property` match). */
  props?: Record<string, unknown>;
  /** Optional status ring (loading/success/error). */
  status?: FlowNodeStatus;
};

export type FlowEdgeData = {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
};

export type FlowModel = {
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
};

export type FlowNodeShape = "rect" | "pill" | "diamond";

/** A presentation rule: match a node, assign a visual variant. */
export type NodePresentationRule = {
  match?: {
    /** Match when `node.nodeType === nodeType`. */
    nodeType?: string;
    /** Match when `node.props[property]` equals `eq` (or is truthy if `eq` omitted). */
    property?: string;
    eq?: unknown;
  };
  /** Free-form variant label (informational). */
  variant?: string;
  color?: FlowColorToken | string;
  shape?: FlowNodeShape;
  /** Property key to read the display title from (falls back to `node.title`). */
  titleFrom?: string;
  /** Property key to read a small badge label from. */
  badgeFrom?: string;
};

/** Resolved visual variant for one node. */
export type ResolvedNodeStyle = {
  variant?: string;
  color: FlowColorToken;
  shape: FlowNodeShape;
  title: string;
  badge?: string;
};

export const DEFAULT_NODE_WIDTH = 168;
export const DEFAULT_NODE_HEIGHT = 44;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function coerceNode(raw: unknown, index: number): FlowNodeData | null {
  if (!isRecord(raw)) return null;
  const id =
    typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `n${index}`;
  const title =
    typeof raw.title === "string"
      ? raw.title
      : typeof raw.label === "string"
        ? raw.label
        : "Untitled";
  const node: FlowNodeData = { id, title };
  if (typeof raw.nodeType === "string") node.nodeType = raw.nodeType;
  if (typeof raw.x === "number") node.x = raw.x;
  if (typeof raw.y === "number") node.y = raw.y;
  if (typeof raw.width === "number" && raw.width > 0) node.width = raw.width;
  if (typeof raw.height === "number" && raw.height > 0) node.height = raw.height;
  if (isRecord(raw.props)) node.props = raw.props;
  if (
    raw.status === "loading" ||
    raw.status === "success" ||
    raw.status === "error"
  )
    node.status = raw.status;
  return node;
}

function coerceEdge(
  raw: unknown,
  index: number,
  nodeIds: Set<string>,
): FlowEdgeData | null {
  if (!isRecord(raw)) return null;
  const source = typeof raw.source === "string" ? raw.source : undefined;
  const target = typeof raw.target === "string" ? raw.target : undefined;
  if (!source || !target) return null;
  // Drop edges that dangle (point at a node not in the set) — keeps RF happy.
  if (!nodeIds.has(source) || !nodeIds.has(target)) return null;
  const id =
    typeof raw.id === "string" && raw.id.length > 0
      ? raw.id
      : `e${index}-${source}-${target}`;
  const edge: FlowEdgeData = { id, source, target };
  if (typeof raw.label === "string") edge.label = raw.label;
  if (typeof raw.animated === "boolean") edge.animated = raw.animated;
  return edge;
}

/** Normalize an unknown jsonb value into a well-formed FlowModel. */
export function coerceFlow(value: unknown): FlowModel {
  const v = isRecord(value) ? value : {};
  const rawNodes = Array.isArray(v.nodes) ? v.nodes : [];
  const nodes = rawNodes
    .map((n, i) => coerceNode(n, i))
    .filter((n): n is FlowNodeData => n !== null);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const rawEdges = Array.isArray(v.edges) ? v.edges : [];
  const edges = rawEdges
    .map((e, i) => coerceEdge(e, i, nodeIds))
    .filter((e): e is FlowEdgeData => e !== null);
  return { nodes, edges };
}

/** Coerce an unknown manifest value into presentation rules. */
export function coercePresentation(value: unknown): NodePresentationRule[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is NodePresentationRule => isRecord(r));
}

function ruleMatches(rule: NodePresentationRule, node: FlowNodeData): boolean {
  const m = rule.match;
  if (!m) return true; // catch-all rule
  if (m.nodeType !== undefined) return node.nodeType === m.nodeType;
  if (m.property !== undefined) {
    const actual = node.props?.[m.property];
    return m.eq === undefined ? Boolean(actual) : actual === m.eq;
  }
  return true;
}

/** Resolve a node's visual variant from the first matching manifest rule. */
export function resolveNodeStyle(
  node: FlowNodeData,
  manifest: NodePresentationRule[],
): ResolvedNodeStyle {
  const rule = manifest.find((r) => ruleMatches(r, node));
  const title =
    rule?.titleFrom && typeof node.props?.[rule.titleFrom] === "string"
      ? (node.props[rule.titleFrom] as string)
      : node.title;
  const badgeRaw = rule?.badgeFrom ? node.props?.[rule.badgeFrom] : undefined;
  const badge =
    badgeRaw === undefined || badgeRaw === null ? undefined : String(badgeRaw);
  return {
    variant: rule?.variant,
    color: asColorToken(rule?.color),
    shape: rule?.shape ?? "rect",
    title,
    badge,
  };
}
