import type { GraphNode } from "@ssota/core";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import {
  aggregateObjectiveHealth,
  computeKeyResultHealth,
  computeProgress,
  parseMetricValue,
  summarizeGoalsHealth,
} from "@/lib/graph/goals/compute-goal-health";
import type {
  GoalKeyResultRow,
  GoalKpiRow,
  GoalObjectiveRow,
  GoalsDashboardDTO,
} from "@/lib/graph/goals/types";

function propString(node: GraphNode, key: string): string | undefined {
  const value = node.properties[key];
  return typeof value === "string" ? value : undefined;
}

function sortOrder(node: GraphNode): number {
  const value = node.properties.sort_order;
  return typeof value === "number" ? value : 0;
}

function buildKpiRow(
  node: GraphNode,
  latestSnapshotValue?: number | null,
): GoalKpiRow {
  const baseline = parseMetricValue(node.properties.baseline);
  const current = latestSnapshotValue ?? baseline ?? null;
  const target = parseMetricValue(node.properties.target);
  let delta: number | undefined;
  if (current !== null && baseline !== null) {
    delta = current - baseline;
  }

  return {
    id: node.id,
    title: node.title || "Untitled KPI",
    baseline: baseline ?? undefined,
    target: target ?? undefined,
    current: current ?? undefined,
    unit: propString(node, "unit"),
    cadence: propString(node, "cadence"),
    direction: propString(node, "direction"),
    status: propString(node, "status"),
    delta,
  };
}

function buildKeyResultRow(
  node: GraphNode,
  measuredByKpiId: string | undefined,
  snapshotValue: number | null | undefined,
): GoalKeyResultRow {
  const baseline = parseMetricValue(node.properties.baseline);
  const manualCurrent = parseMetricValue(node.properties.current_value);
  const current = snapshotValue ?? manualCurrent ?? baseline;
  const target = parseMetricValue(node.properties.target);
  const direction = propString(node, "direction");
  const explicitStatus = propString(node, "status");

  const status = computeKeyResultHealth({
    baseline,
    current,
    target,
    direction,
    dueAt: propString(node, "due_at"),
    explicitStatus,
  });

  return {
    id: node.id,
    title: node.title || "Untitled key result",
    metricName: propString(node, "metric_name"),
    baseline: baseline ?? undefined,
    current: current ?? undefined,
    target: target ?? undefined,
    unit: propString(node, "unit"),
    direction,
    status,
    progress: computeProgress({ baseline, current, target, direction }),
    dueAt: propString(node, "due_at"),
    measuredByKpiId,
  };
}

async function buildLatestSnapshotByKpi(
  projectId: string,
  snapshots: GraphNode[],
): Promise<Map<string, number>> {
  const { graphRead } = getGraphDeps(projectId);
  const latest = new Map<string, { value: number; capturedAt: string }>();

  for (const snapshot of snapshots) {
    const value = parseMetricValue(snapshot.properties.value);
    if (value === null) continue;

    const edges = await graphRead.traverseEdges({
      projectId,
      nodeId: snapshot.id,
      direction: "outgoing",
      catalogKey: "snapshotted_from",
    });

    const capturedAt =
      propString(snapshot, "captured_at") ?? snapshot.createdAt.toISOString();

    for (const edge of edges) {
      const prev = latest.get(edge.targetNodeId);
      if (!prev || capturedAt >= prev.capturedAt) {
        latest.set(edge.targetNodeId, { value, capturedAt });
      }
    }
  }

  return new Map(
    [...latest.entries()].map(([kpiId, entry]) => [kpiId, entry.value]),
  );
}

export async function loadGoalsDashboard(
  projectId: string,
): Promise<GoalsDashboardDTO> {
  const { graphRead } = getGraphDeps(projectId);

  const [objectives, keyResults, kpis, snapshots, roadmaps] = await Promise.all([
    graphRead.queryNodes({ projectId, catalogKey: "objective", limit: 200 }),
    graphRead.queryNodes({ projectId, catalogKey: "key_result", limit: 200 }),
    graphRead.queryNodes({ projectId, catalogKey: "kpi", limit: 200 }),
    graphRead.queryNodes({ projectId, catalogKey: "metric_snapshot", limit: 500 }),
    graphRead.queryNodes({ projectId, catalogKey: "roadmap", limit: 10 }),
  ]);

  const latestSnapshotByKpi = await buildLatestSnapshotByKpi(projectId, snapshots);
  const kpiById = new Map(kpis.map((k) => [k.id, k]));
  const krById = new Map(keyResults.map((kr) => [kr.id, kr]));

  const krToObjective = new Map<string, string>();
  const krToKpi = new Map<string, string>();
  const objectiveToKpis = new Map<string, string[]>();
  const objectiveToRoadmap = new Map<string, { theme?: string; title: string }>();

  await Promise.all(
    keyResults.map(async (kr) => {
      const [contribEdges, measureEdges] = await Promise.all([
        graphRead.traverseEdges({
          projectId,
          nodeId: kr.id,
          direction: "outgoing",
          catalogKey: "contributes_to",
        }),
        graphRead.traverseEdges({
          projectId,
          nodeId: kr.id,
          direction: "outgoing",
          catalogKey: "measured_by",
        }),
      ]);
      for (const edge of contribEdges) {
        krToObjective.set(kr.id, edge.targetNodeId);
      }
      for (const edge of measureEdges) {
        krToKpi.set(kr.id, edge.targetNodeId);
      }
    }),
  );

  await Promise.all(
    objectives.map(async (objective) => {
      const [trackEdges, informEdges] = await Promise.all([
        graphRead.traverseEdges({
          projectId,
          nodeId: objective.id,
          direction: "outgoing",
          catalogKey: "tracked_by",
        }),
        graphRead.traverseEdges({
          projectId,
          nodeId: objective.id,
          direction: "incoming",
          catalogKey: "informs",
        }),
      ]);
      objectiveToKpis.set(
        objective.id,
        trackEdges.map((e) => e.targetNodeId),
      );
      for (const edge of informEdges) {
        const roadmap = roadmaps.find((r) => r.id === edge.sourceNodeId);
        if (roadmap) {
          objectiveToRoadmap.set(objective.id, {
            title: roadmap.title,
            theme: propString(roadmap, "theme"),
          });
        }
      }
    }),
  );

  const linkedKrIds = new Set(krToObjective.keys());
  const linkedKpiIds = new Set<string>();
  for (const kpiId of krToKpi.values()) linkedKpiIds.add(kpiId);
  for (const ids of objectiveToKpis.values()) {
    for (const id of ids) linkedKpiIds.add(id);
  }

  const objectiveRows: GoalObjectiveRow[] = objectives
    .map((objective) => {
      const childKrs = keyResults.filter(
        (kr) => krToObjective.get(kr.id) === objective.id,
      );
      const keyResultRows = childKrs
        .map((kr) => {
          const kpiId = krToKpi.get(kr.id);
          return buildKeyResultRow(
            kr,
            kpiId,
            kpiId ? latestSnapshotByKpi.get(kpiId) : undefined,
          );
        })
        .sort((a, b) => sortOrder(krById.get(a.id)!) - sortOrder(krById.get(b.id)!));

      const trackedKpis = (objectiveToKpis.get(objective.id) ?? [])
        .map((id) => kpiById.get(id))
        .filter((k): k is GraphNode => k != null)
        .map((k) => buildKpiRow(k, latestSnapshotByKpi.get(k.id)));

      const aggregated = aggregateObjectiveHealth(keyResultRows);
      const roadmapMeta = objectiveToRoadmap.get(objective.id);

      return {
        id: objective.id,
        title: objective.title || "Untitled objective",
        period: propString(objective, "period"),
        priority: propString(objective, "priority"),
        status: aggregated.status,
        progress: aggregated.progress,
        audience: propString(objective, "audience"),
        roadmapTheme: roadmapMeta?.theme ?? roadmapMeta?.title,
        keyResults: keyResultRows,
        trackedKpis,
        _sort: sortOrder(objective),
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort: _, ...row }) => row);

  const unlinkedKeyResults = keyResults
    .filter((kr) => !linkedKrIds.has(kr.id))
    .map((kr) =>
      buildKeyResultRow(kr, krToKpi.get(kr.id), undefined),
    );

  const unlinkedKpis = kpis
    .filter((k) => !linkedKpiIds.has(k.id))
    .map((k) => buildKpiRow(k, latestSnapshotByKpi.get(k.id)));

  const kpiPulse = kpis.map((k) => buildKpiRow(k, latestSnapshotByKpi.get(k.id)));

  const periodOptions = [
    ...new Set(
      objectives
        .map((o) => propString(o, "period"))
        .filter((p): p is string => Boolean(p)),
    ),
  ];

  const primaryRoadmap = roadmaps[0];
  const allKeyResults = [
    ...objectiveRows.flatMap((o) => o.keyResults),
    ...unlinkedKeyResults,
  ];
  const healthSummary = summarizeGoalsHealth({
    objectives: objectiveRows,
    keyResults: allKeyResults,
    kpis,
  });

  return {
    summary: {
      objectiveCount: objectives.length,
      keyResultCount: keyResults.length,
      kpiCount: kpis.length,
      atRiskCount: healthSummary.atRiskCount,
      achievedCount: healthSummary.achievedCount,
      periodProgress: healthSummary.periodProgress,
    },
    periodOptions,
    roadmapContext: primaryRoadmap
      ? {
          id: primaryRoadmap.id,
          title: primaryRoadmap.title || "Roadmap",
          theme: propString(primaryRoadmap, "theme"),
          period: propString(primaryRoadmap, "period"),
        }
      : undefined,
    objectives: objectiveRows,
    unlinkedKeyResults,
    unlinkedKpis,
    kpiPulse,
  };
}
