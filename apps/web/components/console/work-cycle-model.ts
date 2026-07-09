import type {
  GatePolicyProperties,
  WorkCycleGroup,
  WorkCycleProperties,
  WorkCycleTopology,
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
};

export type TopologyNodeData = {
  kind: "topology";
  nodeKind: "trigger" | "stage" | "gate" | "end";
  label: string;
  catalogKeys?: string[];
  gatePolicyKey?: string;
  gateSummary?: string;
  owner?: string;
};

export function buildOverviewModel(cycles: WorkCycleInstance[]) {
  const sorted = [...cycles].sort(
    (a, b) => a.properties.sortOrder - b.properties.sortOrder,
  );
  const nodes = sorted.map((c) => {
    const meta = WORK_CYCLE_GROUP_META[c.properties.group];
    const topo = c.properties.topology;
    return {
      id: c.properties.cycleKey,
      data: {
        kind: "cycle" as const,
        cycleKey: c.properties.cycleKey,
        title: c.title,
        group: c.properties.group,
        letter: meta.letter,
        orchestratorMode: c.properties.orchestratorMode,
        gateCount: topo.nodes.filter((n) => n.kind === "gate").length,
        stageCount: topo.nodes.filter((n) => n.kind === "stage").length,
      } satisfies OverviewNodeData,
    };
  });

  const knownKeys = new Set(sorted.map((c) => c.properties.cycleKey));
  const edges: Array<{
    id: string;
    source: string;
    target: string;
    kind: "handoff" | "feed";
    label?: string;
  }> = [];
  for (const c of sorted) {
    for (const target of c.properties.handoffToCycleKeys ?? []) {
      // Skip dangling handoffs — ELK rejects edges to missing node ids.
      if (!knownKeys.has(target)) continue;
      edges.push({
        id: `${c.properties.cycleKey}->${target}`,
        source: c.properties.cycleKey,
        target,
        kind: "handoff",
      });
    }
  }
  return { nodes, edges };
}

export function buildTopologyModel(
  topology: WorkCycleTopology,
  policiesByKey: Map<string, GatePolicyInstance>,
) {
  const nodes = topology.nodes.map((n) => {
    const policy = n.gatePolicyKey
      ? policiesByKey.get(n.gatePolicyKey)
      : undefined;
    const require0 = policy?.properties.require[0];
    return {
      id: n.id,
      data: {
        kind: "topology" as const,
        nodeKind: n.kind,
        label: n.label,
        catalogKeys: n.catalogKeys,
        gatePolicyKey: n.gatePolicyKey,
        gateSummary: require0
          ? `${require0.path}${require0.in ? ` ∈ [${require0.in.join(",")}]` : ""}`
          : undefined,
        owner: n.owner,
      } satisfies TopologyNodeData,
    };
  });
  return { nodes, edges: topology.edges };
}
