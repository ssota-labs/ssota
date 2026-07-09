import {
  gatePolicyPropertiesSchema,
  parseGatePath,
  type GateEffect,
  type GateHook,
  type GateMatch,
  type GatePathHop,
  type GatePolicyProperties,
  type GateRequirement,
} from "@ssota/contracts";
import type { GraphNode } from "../domain/graph-types.js";
import { GraphError } from "../domain/graph-errors.js";
import { TaskError } from "../domain/task-errors.js";
import type { GraphReadPort } from "../ports/graph-read-port.js";
import type { SpawnTaskDeps } from "../use-cases/spawn-task.js";

export type GateEvalContext = {
  hook: GateHook;
  teamspaceId: string;
  /** Node the path expression starts from (existing node, initiative scope, etc.) */
  subjectNodeId?: string | null;
  /** Catalog key of the mutation target (create/update/edge) */
  catalogKey?: string;
  /** Spawn target agent */
  agentDefinitionId?: string;
  /** Proposed or resulting properties of the subject / target */
  properties?: Record<string, unknown>;
  /** Previous properties (update) — for match.property transition detection */
  previousProperties?: Record<string, unknown>;
  title?: string;
};

export type GatePolicyRecord = {
  id: string;
  properties: GatePolicyProperties;
};

export interface GatePolicySource {
  listGatePolicies(teamspaceId: string): Promise<GatePolicyRecord[]>;
}

function hooksOf(policy: GatePolicyProperties): GateHook[] {
  return Array.isArray(policy.when) ? policy.when : [policy.when];
}

function readProp(
  properties: Record<string, unknown> | undefined,
  path: string,
): unknown {
  if (!properties) return undefined;
  const parts = path.split(".");
  let cur: unknown = properties;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function valueMatches(
  value: unknown,
  req: Pick<GateRequirement, "in" | "notIn">,
): boolean {
  const asString =
    value === null || value === undefined
      ? undefined
      : typeof value === "string"
        ? value
        : String(value);
  if (req.in && (asString === undefined || !req.in.includes(asString))) {
    return false;
  }
  if (req.notIn && asString !== undefined && req.notIn.includes(asString)) {
    return false;
  }
  return true;
}

function matchApplies(match: GateMatch, ctx: GateEvalContext): boolean {
  if (match.catalogKey && match.catalogKey !== ctx.catalogKey) return false;
  if (
    match.agentDefinitionId &&
    match.agentDefinitionId !== ctx.agentDefinitionId
  ) {
    return false;
  }
  if (match.property) {
    const next = readProp(ctx.properties, match.property.path);
    if (!valueMatches(next, match.property)) return false;
  }
  return true;
}

async function resolveRelatedNodes(
  graphRead: GraphReadPort,
  teamspaceId: string,
  startNodeId: string,
  hops: GatePathHop[],
): Promise<GraphNode[]> {
  let frontier: string[] = [startNodeId];
  for (const hop of hops) {
    const nextIds: string[] = [];
    for (const nodeId of frontier) {
      const edges = await graphRead.traverseEdges({
        teamspaceId,
        nodeId,
        catalogKey: hop.edgeCatalogKey,
        direction: hop.direction === "out" ? "outgoing" : "incoming",
      });
      for (const edge of edges) {
        const otherId =
          hop.direction === "out" ? edge.targetNodeId : edge.sourceNodeId;
        const other = await graphRead.getNodeById(otherId);
        if (other && other.catalogKey === hop.nodeCatalogKey) {
          nextIds.push(other.id);
        }
      }
    }
    frontier = [...new Set(nextIds)];
    if (frontier.length === 0) return [];
  }
  const nodes: GraphNode[] = [];
  for (const id of frontier) {
    const n = await graphRead.getNodeById(id);
    if (n) nodes.push(n);
  }
  return nodes;
}

async function evaluateRequirement(
  graphRead: GraphReadPort,
  ctx: GateEvalContext,
  req: GateRequirement,
): Promise<boolean> {
  const ast = parseGatePath(req.path);

  if (ast.kind === "self") {
    const value = readProp(ctx.properties, ast.propPath);
    if (value === undefined) {
      return req.ifMissing === "pass";
    }
    return valueMatches(value, req);
  }

  if (!ctx.subjectNodeId) {
    return req.ifMissing === "pass";
  }

  const related = await resolveRelatedNodes(
    graphRead,
    ctx.teamspaceId,
    ctx.subjectNodeId,
    ast.hops,
  );

  if (req.count) {
    const n = related.length;
    if (n === 0 && req.ifMissing === "pass") return true;
    if (req.count.min != null && n < req.count.min) return false;
    if (req.count.max != null && n > req.count.max) return false;
    return true;
  }

  if (related.length === 0) {
    return req.ifMissing === "pass";
  }

  const propPath = ast.propPath!;
  return related.some((node) =>
    valueMatches(readProp(node.properties, propPath), req),
  );
}

function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export async function evaluateGatePolicies(
  deps: {
    graphRead: GraphReadPort;
    gatePolicies: GatePolicySource;
  },
  ctx: GateEvalContext,
): Promise<void> {
  const rows = await deps.gatePolicies.listGatePolicies(ctx.teamspaceId);
  for (const row of rows) {
    let policy: GatePolicyProperties;
    try {
      policy = gatePolicyPropertiesSchema.parse(row.properties);
    } catch {
      continue;
    }

    const included = policy.includedTeamspaceIds ?? [];
    if (
      included.length > 0 &&
      !included.includes(ctx.teamspaceId)
    ) {
      continue;
    }

    if (!hooksOf(policy).includes(ctx.hook)) continue;
    if (!matchApplies(policy.match, ctx)) continue;

    for (const req of policy.require) {
      const ok = await evaluateRequirement(deps.graphRead, ctx, req);
      if (!ok) {
        const code = policy.onFail.code;
        const message =
          policy.onFail.messageTemplate ??
          `Gate policy '${policy.policyKey}' failed`;
        if (ctx.hook === "before_spawn_task") {
          throw new TaskError(code, message);
        }
        throw new GraphError(code, message);
      }
    }
  }
}

/**
 * After a successful update: run onPass effects for policies whose match
 * applies to the new state and whose require is now satisfied.
 */
export async function runGateOnPassEffects(
  deps: {
    graphRead: GraphReadPort;
    gatePolicies: GatePolicySource;
    spawn: SpawnTaskDeps;
  },
  ctx: GateEvalContext & { subjectNodeId: string },
): Promise<void> {
  const rows = await deps.gatePolicies.listGatePolicies(ctx.teamspaceId);
  const varsBase = {
    nodeId: ctx.subjectNodeId,
    nodeTitle: ctx.title ?? "",
  };

  for (const row of rows) {
    let policy: GatePolicyProperties;
    try {
      policy = gatePolicyPropertiesSchema.parse(row.properties);
    } catch {
      continue;
    }
    if (!policy.onPass?.effects.length) continue;

    const included = policy.includedTeamspaceIds ?? [];
    if (included.length > 0 && !included.includes(ctx.teamspaceId)) continue;
    if (!hooksOf(policy).includes("before_update_node")) continue;
    if (!matchApplies(policy.match, { ...ctx, hook: "before_update_node" })) {
      continue;
    }

    let allOk = true;
    for (const req of policy.require) {
      if (!(await evaluateRequirement(deps.graphRead, ctx, req))) {
        allOk = false;
        break;
      }
    }
    if (!allOk) continue;

    // Skip if previous state already satisfied (avoid re-spawn on unrelated edits)
    if (ctx.previousProperties) {
      let previouslyOk = true;
      for (const req of policy.require) {
        const prevCtx = { ...ctx, properties: ctx.previousProperties };
        if (!(await evaluateRequirement(deps.graphRead, prevCtx, req))) {
          previouslyOk = false;
          break;
        }
      }
      if (previouslyOk) continue;
    }

    const vars = { ...varsBase, policyKey: policy.policyKey };
    for (const effect of policy.onPass.effects) {
      await runEffect(
        deps.spawn,
        deps.graphRead,
        ctx.teamspaceId,
        effect,
        vars,
        ctx,
      );
    }
  }
}

async function runEffect(
  spawnDeps: SpawnTaskDeps,
  graphRead: GraphReadPort,
  teamspaceId: string,
  effect: GateEffect,
  vars: Record<string, string>,
  ctx: GateEvalContext,
): Promise<void> {
  if (effect.kind !== "spawn_task") return;
  const title = effect.titleTemplate
    ? renderTemplate(effect.titleTemplate, vars)
    : `Gate: ${vars.policyKey}`;
  const idempotencyKey = renderTemplate(effect.idempotencyKeyTemplate, vars);

  let targetNodeId: string | undefined;
  if (effect.targetNodePath && ctx.subjectNodeId) {
    const ast = parseGatePath(effect.targetNodePath);
    if (ast.kind === "related") {
      const related = await resolveRelatedNodes(
        graphRead,
        teamspaceId,
        ctx.subjectNodeId,
        ast.hops,
      );
      targetNodeId = related[0]?.id;
    }
  } else if (effect.includeSubjectNode && ctx.subjectNodeId) {
    targetNodeId = ctx.subjectNodeId;
  }

  await spawnTask(spawnDeps, teamspaceId, {
    title,
    agentDefinitionId: effect.agentDefinitionId,
    executorType: effect.executorType ?? "Agent",
    idempotencyKey,
    targetNodeId,
    status: "ready",
  });
}

async function spawnTask(
  spawnDeps: SpawnTaskDeps,
  teamspaceId: string,
  input: Parameters<
    typeof import("../use-cases/spawn-task.js").spawnTask
  >[2],
): Promise<void> {
  // Dynamic import avoids circular dependency with spawn-task.ts
  const { spawnTask: spawn } = await import("../use-cases/spawn-task.js");
  await spawn(spawnDeps, teamspaceId, input);
}

/** Build a GatePolicySource from graph nodes with catalogKey gate_policy. */
export function createGraphGatePolicySource(
  graphRead: GraphReadPort,
): GatePolicySource {
  return {
    async listGatePolicies(teamspaceId: string) {
      const nodes = await graphRead.queryNodes({
        teamspaceId,
        catalogKey: "gate_policy",
        limit: 500,
      });
      return nodes.map((n) => ({
        id: n.id,
        properties: n.properties as GatePolicyProperties,
      }));
    },
  };
}
