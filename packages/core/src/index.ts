import type { Effect, ExecuteActionInput, ExecuteActionResult } from "@loopos/contracts";
import {
  checkArchetypeDeviation,
  checkPreconditions,
  enforceCatalog,
  enforceEffectsContract,
  enforceGateRules,
  enforcePermissions,
  resolveEffects,
} from "./domain/enforcement.js";
import {
  ActionRejectedError,
  type ActionPorts,
  type Node,
} from "./domain/types.js";

export async function executeAction(
  ports: ActionPorts,
  params: ExecuteActionInput,
): Promise<ExecuteActionResult> {
  const { actionType, input, executorId, executorType, idempotencyKey } =
    params;

  if (idempotencyKey) {
    const existing = await ports.commit.findByIdempotencyKey(idempotencyKey);
    if (existing && existing.outcome === "committed") {
      return {
        status: "committed",
        logId: existing.id,
        effects: existing.effects,
      };
    }
  }

  const actionEntry = await ports.catalog.getActionCatalogEntry(actionType);

  let effects: Effect[];
  try {
    effects = actionEntry
      ? resolveEffects(actionEntry, input)
      : [];
  } catch {
    if (!actionEntry) {
      return {
        status: "rejected",
        reason: `Action '${actionType}' is not in the action catalog`,
        code: "CATALOG_NOT_FOUND",
      };
    }
    effects = [];
  }

  const nodeTypesInEffects = effects
    .filter((e) => e.kind === "create_node")
    .map((e) => (e.kind === "create_node" ? e.node.nodeType : ""));

  try {
    await enforceCatalog(
      actionType,
      actionEntry,
      nodeTypesInEffects,
      (nodeType) => ports.catalog.getNodeCatalogEntry(nodeType),
    );
  } catch (err) {
    if (err instanceof ActionRejectedError) {
      return { status: "rejected", reason: err.message, code: err.code };
    }
    throw err;
  }

  const existingNodes = new Map<string, Node>();
  for (const effect of effects) {
    if (effect.kind === "update_node") {
      const node = await ports.graph.getNode(effect.nodeId);
      if (node) existingNodes.set(effect.nodeId, node);
    }
  }

  try {
    checkPreconditions(actionEntry!, input, { nodes: existingNodes });
    enforceEffectsContract(actionEntry!, effects);
  } catch (err) {
    if (err instanceof ActionRejectedError) {
      return { status: "rejected", reason: err.message, code: err.code };
    }
    throw err;
  }

  try {
    await enforcePermissions(
      actionType,
      effects,
      (at, nt) => ports.catalog.getPropertyPermissions(at, nt),
      (nodeId) => ports.graph.getNode(nodeId),
    );
  } catch (err) {
    if (err instanceof ActionRejectedError) {
      return { status: "rejected", reason: err.message, code: err.code };
    }
    throw err;
  }

  const nodeCatalogEntries = new Map();
  for (const effect of effects) {
    if (effect.kind === "create_node") {
      const entry = await ports.catalog.getNodeCatalogEntry(effect.node.nodeType);
      if (entry) nodeCatalogEntries.set(effect.node.nodeType, entry);
    } else if (effect.kind === "update_node") {
      const node = existingNodes.get(effect.nodeId);
      if (node) {
        const entry = await ports.catalog.getNodeCatalogEntry(node.nodeType);
        if (entry) nodeCatalogEntries.set(node.nodeType, entry);
      }
    }
  }

  const gateCheck = enforceGateRules(
    actionEntry!,
    executorType,
    effects,
    nodeCatalogEntries,
    existingNodes,
  );

  const deviation = await checkArchetypeDeviation(
    effects,
    (nodeType) => ports.catalog.getNodeCatalogEntry(nodeType),
    (archetypeId) => ports.catalog.getArchetype(archetypeId),
    (nodeId) => ports.graph.getNode(nodeId),
  );

  const needsGate = gateCheck.requiresGate || deviation.deviates;

  if (needsGate && actionType !== "approve_gate") {
    const gate = await ports.gate.createGate({
      actionType,
      executorId,
      input,
      proposedEffects: effects,
      status: "pending",
      reason: gateCheck.reason || deviation.reason,
    });

    await ports.commit.commit({
      effects: [],
      logEntry: {
        actionType,
        executorId,
        executorType,
        input,
        effects,
        outcome: "gated",
        gateId: gate.id,
        idempotencyKey,
      },
    });

    return {
      status: "gated",
      gateId: gate.id,
      message: gateCheck.reason || deviation.reason,
    };
  }

  try {
    const result = await ports.commit.commit({
      effects,
      logEntry: {
        actionType,
        executorId,
        executorType,
        input,
        effects,
        outcome: "committed",
        idempotencyKey,
      },
    });

    return {
      status: "committed",
      logId: result.logId,
      effects: result.appliedEffects,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Commit failed";
    return { status: "rejected", reason: message, code: "COMMIT_FAILED" };
  }
}

export async function approveGate(
  ports: ActionPorts,
  params: {
    gateId: string;
    executorId: string;
    executorType: "Human";
    approved: boolean;
    decisionNote?: string;
  },
): Promise<ExecuteActionResult> {
  return executeAction(ports, {
    actionType: "approve_gate",
    input: {
      gateId: params.gateId,
      status: params.approved ? "approved" : "rejected",
      decisionNote: params.decisionNote,
    },
    executorId: params.executorId,
    executorType: params.executorType,
  });
}

export * from "./domain/types.js";
export * from "./domain/enforcement.js";
