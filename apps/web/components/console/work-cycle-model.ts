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
/** reject_loop 엣지가 그룹 하단으로 우회할 때 필요한 추가 여백. */
export const SUBFLOW_LOOP_PAD = 48;
export const SUBFLOW_CHILD_W = 240;
export const SUBFLOW_CHILD_H = 72;
export const SUBFLOW_GATE_H = 120;
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
    /** 역방향(루프백)·자기 자신 엣지 — layered 랭크 계산에서 제외하고 하단 핸들로 라우팅한다. */
    backward?: boolean;
  };

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  /** Local layout specs for expanded topologies (laid out separately). */
  const nestedLayouts: Array<{
    cycleKey: string;
    nodes: Array<{ id: string; width: number; height: number }>;
    edges: Array<{ id: string; source: string; target: string }>;
    /** 하단 우회 엣지(reject_loop 등)가 있어 그룹에 아래 여백이 필요한지. */
    hasBackEdges: boolean;
  }> = [];

  /**
   * Cross-cycle handoff의 역방향 판정: sortOrder 순서로 엣지를 추가하며
   * 이미 target→source 도달 가능(사이클을 닫는 엣지)이면 back-edge로 본다.
   */
  const forwardAdjacency = new Map<string, Set<string>>();
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>([from]);
    const stack = [from];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (cur === to) return true;
      for (const next of forwardAdjacency.get(cur) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    return false;
  };

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

      // 레이아웃 입력에는 forward 엣지만 — reject_loop(역방향)·self 엣지를 넣으면
      // layered 랭크가 꼬여 좌→우 흐름이 무너진다. 렌더링은 전체 엣지로 한다.
      const isBackTopoEdge = (e: { kind: string; source: string; target: string }) =>
        e.kind === "reject_loop" || e.source === e.target;
      nestedLayouts.push({
        cycleKey,
        nodes: childSpecs.map((s) => ({
          id: s.id,
          width: s.width,
          height: s.height,
        })),
        edges: topo.edges
          .filter((e) => !isBackTopoEdge(e))
          .map((e) => ({
            id: `${cycleKey}::${e.id}`,
            source: topologyNodeId(cycleKey, e.source),
            target: topologyNodeId(cycleKey, e.target),
          })),
        hasBackEdges: topo.edges.some(isBackTopoEdge),
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
          backward: e.kind === "reject_loop" || e.source === e.target,
        });
      }
    }

    for (const target of c.properties.handoffToCycleKeys ?? []) {
      if (!knownKeys.has(target)) continue;
      // 사이클을 닫는 handoff(예: launch→direction)는 back-edge — 레이아웃 제외 + 하단 라우팅.
      const backward = target === cycleKey || reaches(target, cycleKey);
      if (!backward) {
        const adj = forwardAdjacency.get(cycleKey) ?? new Set<string>();
        adj.add(target);
        forwardAdjacency.set(cycleKey, adj);
      }
      edges.push({
        id: `${cycleKey}->${target}`,
        source: cycleKey,
        target,
        kind: "handoff",
        backward,
      });
    }
  }

  return { nodes, edges, nestedLayouts };
}
