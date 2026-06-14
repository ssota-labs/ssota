import type {
  ActionLogRecord,
  Edge,
  GraphReadPort,
  ImpactQueueCreateInput,
  Node,
} from "./domain/types.js";

export interface ImpactProjectionRule {
  workflowKey: string;
  direction?: "outgoing" | "incoming" | "both";
  edgeTypes?: string[];
  targetNodeTypes?: string[];
  workflowId?: string;
  priority?: number;
  maxAttempts?: number;
  workflowKeyProperty?: string;
}

export interface ProjectImpactQueueInput {
  actionLog: ActionLogRecord;
  graph: Pick<GraphReadPort, "traverseEdges" | "getNode">;
  rules: ImpactProjectionRule[];
  runAt?: Date;
}

function changedNodeIdsFromEffect(effect: ActionLogRecord["effects"][number]): string[] {
  if (effect.kind === "update_node" || effect.kind === "delete_node") {
    return [effect.nodeId];
  }
  if (effect.kind === "create_node" && effect.node.id) {
    return [effect.node.id];
  }
  if (effect.kind === "create_edge") {
    return [effect.edge.sourceNodeId, effect.edge.targetNodeId];
  }
  return [];
}

export function getChangedNodeIds(actionLog: ActionLogRecord): string[] {
  if (actionLog.outcome !== "committed") return [];
  return [
    ...new Set(actionLog.effects.flatMap((effect) => changedNodeIdsFromEffect(effect))),
  ];
}

function neighborIdForEdge(
  edge: Edge,
  sourceNodeId: string,
  direction: "outgoing" | "incoming" | "both",
): string | null {
  if (
    (direction === "outgoing" || direction === "both") &&
    edge.sourceNodeId === sourceNodeId
  ) {
    return edge.targetNodeId;
  }
  if (
    (direction === "incoming" || direction === "both") &&
    edge.targetNodeId === sourceNodeId
  ) {
    return edge.sourceNodeId;
  }
  return null;
}

async function matchesTargetNodeTypes(
  graph: Pick<GraphReadPort, "getNode">,
  targetNodeId: string,
  targetNodeTypes: string[] | undefined,
): Promise<{ matches: boolean; node: Node | null }> {
  if (!targetNodeTypes?.length) {
    return { matches: true, node: null };
  }
  const node = await graph.getNode(targetNodeId);
  return { matches: Boolean(node && targetNodeTypes.includes(node.nodeType)), node };
}

function resolveWorkflowKey(rule: ImpactProjectionRule, edge: Edge): string {
  if (!rule.workflowKeyProperty) return rule.workflowKey;
  const value = edge.properties[rule.workflowKeyProperty];
  return typeof value === "string" && value.length > 0 ? value : rule.workflowKey;
}

export async function projectImpactQueueItems({
  actionLog,
  graph,
  rules,
  runAt,
}: ProjectImpactQueueInput): Promise<ImpactQueueCreateInput[]> {
  const sourceNodeIds = getChangedNodeIds(actionLog);
  const items = new Map<string, ImpactQueueCreateInput>();

  for (const sourceNodeId of sourceNodeIds) {
    for (const rule of rules) {
      const direction = rule.direction ?? "both";
      const edgeTypes = rule.edgeTypes?.length ? rule.edgeTypes : [undefined];

      for (const edgeType of edgeTypes) {
        const edges = await graph.traverseEdges({
          nodeId: sourceNodeId,
          direction,
          edgeType,
        });

        for (const edge of edges) {
          const targetNodeId = neighborIdForEdge(edge, sourceNodeId, direction);
          if (!targetNodeId || targetNodeId === sourceNodeId) continue;

          const { matches, node } = await matchesTargetNodeTypes(
            graph,
            targetNodeId,
            rule.targetNodeTypes,
          );
          if (!matches) continue;

          const workflowKey = resolveWorkflowKey(rule, edge);
          const idempotencyKey = [
            actionLog.id,
            edge.id,
            targetNodeId,
            workflowKey,
          ].join(":");

          items.set(idempotencyKey, {
            sourceActionLogId: actionLog.id,
            sourceNodeId,
            targetNodeId,
            dependencyEdgeId: edge.id,
            workflowKey,
            workflowId: rule.workflowId ?? null,
            priority: rule.priority,
            runAt,
            maxAttempts: rule.maxAttempts,
            idempotencyKey,
            payload: {
              actionType: actionLog.actionType,
              dependencyEdgeType: edge.edgeType,
              sourceActionLogId: actionLog.id,
              sourceNodeId,
              targetNodeId,
              targetNodeType: node?.nodeType,
            },
          });
        }
      }
    }
  }

  return [...items.values()];
}
