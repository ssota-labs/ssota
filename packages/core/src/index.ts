import type { Effect, ExecuteActionInput, ExecuteActionResult } from "@loopos/contracts";
import {
  checkArchetypeDeviation,
  checkPreconditions,
  enforceCatalog,
  enforceCatalogMutationIntegrity,
  enforceEffectsContract,
  enforceGateRules,
  enforcePermissions,
  resolveEffects,
  validateLifecycleTransitions,
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

  let resolvedInput = input;
  if (actionType === "update_node_type") {
    const nodeType = input.nodeType as string | undefined;
    const patch = input.patch as Record<string, unknown> | undefined;
    if (!nodeType || !patch) {
      return {
        status: "rejected",
        reason: "update_node_type requires nodeType and patch",
        code: "PRECONDITION_FAILED",
      };
    }
    const existing = await ports.catalog.getNodeCatalogEntry(nodeType);
    if (!existing) {
      return {
        status: "rejected",
        reason: `Node type '${nodeType}' does not exist`,
        code: "CATALOG_NOT_FOUND",
      };
    }
    const merged = {
      nodeType,
      family: (patch.family as typeof existing.family | undefined) ?? existing.family,
      archetypeId:
        (patch.archetypeId as string | undefined) ?? existing.archetypeId,
      typicalValueOverrides: {
        ...existing.typicalValueOverrides,
        ...((patch.typicalValueOverrides as Record<string, unknown> | undefined) ??
          {}),
      },
      lifecycleTransitions:
        (patch.lifecycleTransitions as typeof existing.lifecycleTransitions | undefined) ??
        existing.lifecycleTransitions,
      contentGuide:
        patch.contentGuide !== undefined
          ? (patch.contentGuide as string | null)
          : existing.contentGuide,
      propertyRefs: patch.propertyRefs as string[] | undefined,
      allowedActionRefs: patch.allowedActionRefs as string[] | undefined,
    };
    try {
      validateLifecycleTransitions(merged.lifecycleTransitions);
    } catch (err) {
      if (err instanceof ActionRejectedError) {
        return { status: "rejected", reason: err.message, code: err.code };
      }
      throw err;
    }
    resolvedInput = { definition: merged };
  }

  let effects: Effect[];
  try {
    effects = actionEntry
      ? resolveEffects(actionEntry, resolvedInput)
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
    checkPreconditions(actionEntry!, resolvedInput, { nodes: existingNodes });
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

  try {
    await enforceCatalogMutationIntegrity(actionType, effects, {
      getNodeCatalogEntry: (nodeType) =>
        ports.catalog.getNodeCatalogEntry(nodeType),
      getArchetype: (archetypeId) => ports.catalog.getArchetype(archetypeId),
      getPropertyCatalogEntry: (propertyKey) =>
        ports.catalog.getPropertyCatalogEntry(propertyKey),
      getActionCatalogEntry: (at) => ports.catalog.getActionCatalogEntry(at),
      getEdgeCatalogEntry: (edgeType) =>
        ports.catalog.getEdgeCatalogEntry(edgeType),
    });
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
