import { readLifecycleStatus, readNodeContent } from "@ssota/core";
import type {
  WorkflowLensNode,
  WorkflowLensPhase,
  WorkflowLensType,
} from "@/components/workflow-lens/workflow-lens";
import {
  WORKFLOW_LENS_PHASES,
  getWorkflowLensTableHref,
  getWorkflowLensTypeLabel,
} from "@/lib/console/workflow-lens-config";
import { nodeDetailPath, resolveNodeRoute } from "@/lib/console/resolve-node-route";
import type { ProjectRouteContext } from "@/lib/console/paths";
import { getGraphDeps } from "../graph-deps";

export async function buildWorkflowLensPhases(
  ctx: ProjectRouteContext,
  projectId: string,
): Promise<WorkflowLensPhase[]> {
  const { graphRead } = getGraphDeps(projectId);

  const phases: WorkflowLensPhase[] = [];

  for (const phase of WORKFLOW_LENS_PHASES) {
    const types: WorkflowLensType[] = [];

    for (const typeConfig of phase.types) {
      const nodes = await graphRead.queryNodes({
        projectId,
        catalogKey: typeConfig.nodeType,
        limit: 200,
      });

      const rows: WorkflowLensNode[] = await Promise.all(
        nodes.map(async (node) => {
          const canonicalRoute = await resolveNodeRoute(ctx, projectId, node);
          return {
            id: node.id,
            nodeType: node.catalogKey,
            title: node.title || "Untitled",
            lifecycleStatus: readLifecycleStatus(node.properties),
            canonicalUrl: canonicalRoute ?? nodeDetailPath(ctx, node.id),
            content: readNodeContent(node.properties) ?? "",
            updatedAt: node.updatedAt.toISOString(),
            properties: node.properties,
          };
        }),
      );

      types.push({
        nodeType: typeConfig.nodeType,
        label: getWorkflowLensTypeLabel(typeConfig.nodeType),
        slug: typeConfig.nodeType.replace(/_/g, "-"),
        description: typeConfig.description,
        rows,
        tableHref: getWorkflowLensTableHref(ctx, typeConfig.tablePath),
      });
    }

    phases.push({
      key: phase.key,
      title: phase.title,
      description: phase.description,
      types,
    });
  }

  return phases;
}

/** Compact summary for overview hub — phases with total node counts. */
export async function buildWorkflowLensSummary(
  ctx: ProjectRouteContext,
  projectId: string,
): Promise<
  Array<{
    key: string;
    title: string;
    nodeCount: number;
    topTypes: Array<{ nodeType: string; label: string; count: number }>;
  }>
> {
  const phases = await buildWorkflowLensPhases(ctx, projectId);

  return phases.map((phase) => {
    const typeCounts = phase.types
      .map((type) => ({
        nodeType: type.nodeType,
        label: type.label,
        count: type.rows.length,
      }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      key: phase.key,
      title: phase.title,
      nodeCount: typeCounts.reduce((sum, entry) => sum + entry.count, 0),
      topTypes: typeCounts.slice(0, 2),
    };
  });
}
