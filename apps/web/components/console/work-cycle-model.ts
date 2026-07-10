import type {
  GatePolicyProperties,
  WorkCycleGroup,
  WorkCycleProperties,
} from "@ssota/contracts";

export type WorkCycleInstance = {
  id: string;
  title: string;
  properties: WorkCycleProperties;
};

export type GatePolicyInstance = {
  id: string;
  title: string;
  properties: GatePolicyProperties;
};

export const WORK_CYCLE_GROUP_META: Record<
  WorkCycleGroup,
  { letter: string; title: string; sortOrder: number }
> = {
  direction: { letter: "A", title: "Direction / Goals", sortOrder: 10 },
  discovery: { letter: "B", title: "Discovery", sortOrder: 20 },
  planning: { letter: "C", title: "Initiative planning", sortOrder: 30 },
  delivery: { letter: "D", title: "Build / Delivery", sortOrder: 40 },
  launch: { letter: "E", title: "Launch / Operate", sortOrder: 50 },
  design: { letter: "F", title: "Design track", sortOrder: 60 },
  hygiene: { letter: "G", title: "Platform hygiene", sortOrder: 70 },
};

export function filterWorkCyclesForTeamspace(
  cycles: WorkCycleInstance[],
  teamspaceId: string,
): WorkCycleInstance[] {
  return cycles.filter((c) => {
    const ids = c.properties.includedTeamspaceIds ?? [];
    return ids.length === 0 || ids.includes(teamspaceId);
  });
}

export function filterGatePoliciesForTeamspace(
  policies: GatePolicyInstance[],
  teamspaceId: string,
): GatePolicyInstance[] {
  return policies.filter((p) => {
    const ids = p.properties.includedTeamspaceIds ?? [];
    return ids.length === 0 || ids.includes(teamspaceId);
  });
}

export type OverviewNodeData = {
  kind: "cycle";
  cycleKey: string;
  title: string;
  group: WorkCycleGroup;
  letter: string;
  orchestratorMode?: string;
  gateCount: number;
  stageCount: number;
  /** Sub Flow: children nest inside parent when true. */
  expanded: boolean;
  expandable: boolean;
};

export type TopologyNodeData = {
  kind: "topology";
  nodeKind: "trigger" | "stage" | "gate" | "end";
  label: string;
  catalogKeys?: string[];
  gatePolicyKey?: string;
  gateSummary?: string;
  owner?: string;
  parentCycleKey: string;
};

/** Prefix topology node ids so they stay unique across cycles in one canvas. */
export function topologyNodeId(cycleKey: string, localId: string): string {
  return `${cycleKey}::${localId}`;
}

export const SUBFLOW_HEADER_H = 52;
export const SUBFLOW_PAD = 16;
export const SUBFLOW_CHILD_W = 180;
export const SUBFLOW_CHILD_H = 72;
export const SUBFLOW_GATE_H = 88;
export const CYCLE_COLLAPSED_W = 240;
export const CYCLE_COLLAPSED_H = 96;

/**
 * Sub Flow / parent-child model (React Flow official nesting):
 * topology steps use real `parentId` + positions relative to the cycle group.
 * Collapsed cycles omit children; expanded cycles size the parent around kids.
 * @see https://reactflow.dev/learn/layouting/sub-flows
 */
export function buildSubflowModel(
  cycles: WorkCycleInstance[],
  policiesByKey: Map<string, GatePolicyInstance>,
  expandedCycleKeys: ReadonlySet<string>,
) {
  const sorted = [...cycles].sort(
    (a, b) => a.properties.sortOrder - b.properties.sortOrder,
  );
  const knownKeys = new Set(sorted.map((c) => c.properties.cycleKey));

  type GraphNode = {
    id: string;
    parentId?: string;
    width: number;
    height: number;
    /** When set, child positions are relative to parent (RF subflow). */
    relative?: boolean;
    data: OverviewNodeData | TopologyNodeData;
    rfType: "cycleCard" | "cycleGroup" | "topologyStep";
  };

  type GraphEdge = {
    id: string;
    source: string;
    target: string;
    kind: "handoff" | "sequence" | "feed" | "reject_loop";
    label?: string;
  };

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  /** Local layout specs for expanded topologies (laid out separately). */
  const nestedLayouts: Array<{
    cycleKey: string;
    nodes: Array<{ id: string; width: number; height: number }>;
    edges: Array<{ id: string; source: string; target: string }>;
  }> = [];

  for (const c of sorted) {
    const cycleKey = c.properties.cycleKey;
    const meta = WORK_CYCLE_GROUP_META[c.properties.group];
    const topo = c.properties.topology;
    const expanded = expandedCycleKeys.has(cycleKey);
    const gateCount = topo.nodes.filter((n) => n.kind === "gate").length;
    const stageCount = topo.nodes.filter((n) => n.kind === "stage").length;
    const expandable = topo.nodes.length > 0;

    if (!expanded || !expandable) {
      nodes.push({
        id: cycleKey,
        width: CYCLE_COLLAPSED_W,
        height: CYCLE_COLLAPSED_H,
        rfType: "cycleCard",
        data: {
          kind: "cycle",
          cycleKey,
          title: c.title,
          group: c.properties.group,
          letter: meta.letter,
          orchestratorMode: c.properties.orchestratorMode,
          gateCount,
          stageCount,
          expanded: false,
          expandable,
        },
      });
    } else {
      // Parent group first (RF requires parents before children in the array).
      const childSpecs = topo.nodes.map((n) => ({
        id: topologyNodeId(cycleKey, n.id),
        localId: n.id,
        width: SUBFLOW_CHILD_W,
        height: n.kind === "gate" ? SUBFLOW_GATE_H : SUBFLOW_CHILD_H,
        n,
      }));

      nestedLayouts.push({
        cycleKey,
        nodes: childSpecs.map((s) => ({
          id: s.id,
          width: s.width,
          height: s.height,
        })),
        edges: topo.edges.map((e) => ({
          id: `${cycleKey}::${e.id}`,
          source: topologyNodeId(cycleKey, e.source),
          target: topologyNodeId(cycleKey, e.target),
        })),
      });

      // Placeholder size — diagram layer overwrites after nested ELK.
      nodes.push({
        id: cycleKey,
        width: CYCLE_COLLAPSED_W,
        height: CYCLE_COLLAPSED_H,
        rfType: "cycleGroup",
        data: {
          kind: "cycle",
          cycleKey,
          title: c.title,
          group: c.properties.group,
          letter: meta.letter,
          orchestratorMode: c.properties.orchestratorMode,
          gateCount,
          stageCount,
          expanded: true,
          expandable: true,
        },
      });

      for (const s of childSpecs) {
        const policy = s.n.gatePolicyKey
          ? policiesByKey.get(s.n.gatePolicyKey)
          : undefined;
        const require0 = policy?.properties.require[0];
        nodes.push({
          id: s.id,
          parentId: cycleKey,
          relative: true,
          width: s.width,
          height: s.height,
          rfType: "topologyStep",
          data: {
            kind: "topology",
            nodeKind: s.n.kind,
            label: s.n.label,
            catalogKeys: s.n.catalogKeys,
            gatePolicyKey: s.n.gatePolicyKey,
            gateSummary: require0
              ? `${require0.path}${require0.in ? ` ∈ [${require0.in.join(",")}]` : ""}`
              : undefined,
            owner: s.n.owner,
            parentCycleKey: cycleKey,
          },
        });
      }

      for (const e of topo.edges) {
        edges.push({
          id: `${cycleKey}::${e.id}`,
          source: topologyNodeId(cycleKey, e.source),
          target: topologyNodeId(cycleKey, e.target),
          kind:
            e.kind === "reject_loop"
              ? "reject_loop"
              : e.kind === "feed" || e.kind === "handoff"
                ? e.kind
                : "sequence",
          label: e.label,
        });
      }
    }

    for (const target of c.properties.handoffToCycleKeys ?? []) {
      if (!knownKeys.has(target)) continue;
      edges.push({
        id: `${cycleKey}->${target}`,
        source: cycleKey,
        target,
        kind: "handoff",
      });
    }
  }

  return { nodes, edges, nestedLayouts };
}
