import type {
  ActionPreviewResult,
  Effect,
  ExecuteActionInput,
  ExecuteActionResult,
} from "@loopos/contracts";
import {
  checkArchetypeDeviation,
  checkPreconditions,
  enforceCatalog,
  enforceActionScopeAndGraphIntegrity,
  enforceCatalogMutationIntegrity,
  enforceEffectsContract,
  enforceGateRules,
  enforcePermissions,
  resolveEffects,
} from "./domain/enforcement.js";
import {
  mergeUpdateActionContractInput,
  mergeUpdateEdgeTypeInput,
  mergeUpdateInstructionInput,
  mergeUpdateNodeTypeInput,
  mergeUpdatePropertyInput,
} from "./meta-action-input.js";
import {
  ActionRejectedError,
  type ActionPorts,
  type Node,
} from "./domain/types.js";

interface PreparedAction {
  effects: Effect[];
  resolvedInput: Record<string, unknown>;
  breakingChange: boolean;
  permissionGateReason: string;
}

async function prepareAction(
  ports: ActionPorts,
  params: ExecuteActionInput,
): Promise<PreparedAction | { rejected: ExecuteActionResult }> {
  const { actionType, input } = params;
  const actionEntry = await ports.catalog.getActionCatalogEntry(actionType);

  let resolvedInput = input;
  let breakingChange = false;

  if (actionType === "update_node_type") {
    const nodeType = input.nodeType as string | undefined;
    const patch = input.patch as Record<string, unknown> | undefined;
    if (!nodeType || !patch) {
      return {
        rejected: {
          status: "rejected",
          reason: "update_node_type requires nodeType and patch",
          code: "PRECONDITION_FAILED",
        },
      };
    }
    const existing = await ports.catalog.getNodeCatalogEntry(nodeType);
    if (!existing) {
      return {
        rejected: {
          status: "rejected",
          reason: `Node type '${nodeType}' does not exist`,
          code: "CATALOG_NOT_FOUND",
        },
      };
    }
    try {
      const merged = mergeUpdateNodeTypeInput(input, existing);
      resolvedInput = { definition: merged.definition };
      breakingChange = merged.breaking;
    } catch (err) {
      if (err instanceof ActionRejectedError) {
        return {
          rejected: { status: "rejected", reason: err.message, code: err.code },
        };
      }
      throw err;
    }
  }

  if (actionType === "update_edge_type") {
    const edgeType = input.edgeType as string | undefined;
    if (!edgeType || !input.patch) {
      return {
        rejected: {
          status: "rejected",
          reason: "update_edge_type requires edgeType and patch",
          code: "PRECONDITION_FAILED",
        },
      };
    }
    const existing = await ports.catalog.getEdgeCatalogEntry(edgeType);
    if (!existing) {
      return {
        rejected: {
          status: "rejected",
          reason: `Edge type '${edgeType}' does not exist`,
          code: "CATALOG_NOT_FOUND",
        },
      };
    }
    resolvedInput = mergeUpdateEdgeTypeInput(input, existing);
  }

  if (actionType === "update_property") {
    const propertyKey = input.propertyKey as string | undefined;
    if (!propertyKey || !input.patch) {
      return {
        rejected: {
          status: "rejected",
          reason: "update_property requires propertyKey and patch",
          code: "PRECONDITION_FAILED",
        },
      };
    }
    const existing = await ports.catalog.getPropertyCatalogEntry(propertyKey);
    if (!existing) {
      return {
        rejected: {
          status: "rejected",
          reason: `Property '${propertyKey}' does not exist`,
          code: "CATALOG_NOT_FOUND",
        },
      };
    }
    resolvedInput = mergeUpdatePropertyInput(input, existing);
  }

  if (actionType === "update_action_contract") {
    const targetActionType = input.actionType as string | undefined;
    if (!targetActionType || !input.patch) {
      return {
        rejected: {
          status: "rejected",
          reason: "update_action_contract requires actionType and patch",
          code: "PRECONDITION_FAILED",
        },
      };
    }
    const existing = await ports.catalog.getActionCatalogEntry(targetActionType);
    if (!existing) {
      return {
        rejected: {
          status: "rejected",
          reason: `Action '${targetActionType}' does not exist`,
          code: "CATALOG_NOT_FOUND",
        },
      };
    }
    resolvedInput = mergeUpdateActionContractInput(input, existing);
  }

  if (actionType === "update_instruction") {
    const instructionId = input.instructionId as string | undefined;
    if (!instructionId || !input.patch) {
      return {
        rejected: {
          status: "rejected",
          reason: "update_instruction requires instructionId and patch",
          code: "PRECONDITION_FAILED",
        },
      };
    }
    const existing = await ports.catalog.getInstruction(instructionId);
    if (!existing) {
      return {
        rejected: {
          status: "rejected",
          reason: `Instruction '${instructionId}' does not exist`,
          code: "CATALOG_NOT_FOUND",
        },
      };
    }
    resolvedInput = mergeUpdateInstructionInput(input, existing);
  }

  let effects: Effect[];
  try {
    effects = actionEntry ? resolveEffects(actionEntry, resolvedInput) : [];
  } catch (err) {
    if (err instanceof ActionRejectedError) {
      return {
        rejected: { status: "rejected", reason: err.message, code: err.code },
      };
    }
    if (!actionEntry) {
      return {
        rejected: {
          status: "rejected",
          reason: `Action '${actionType}' is not in the action catalog`,
          code: "CATALOG_NOT_FOUND",
        },
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
      return {
        rejected: { status: "rejected", reason: err.message, code: err.code },
      };
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
      return {
        rejected: { status: "rejected", reason: err.message, code: err.code },
      };
    }
    throw err;
  }

  let permissionGateReason = "";
  try {
    const permissionCheck = await enforcePermissions(
      actionType,
      effects,
      (at, nt) => ports.catalog.getPropertyPermissions(at, nt),
      (nodeId) => ports.graph.getNode(nodeId),
      (nodeType) => ports.catalog.getNodeCatalogEntry(nodeType),
      (propertyKey) => ports.catalog.getPropertyCatalogEntry(propertyKey),
    );
    if (permissionCheck.requiresGate) {
      permissionGateReason = permissionCheck.reason;
    }
  } catch (err) {
    if (err instanceof ActionRejectedError) {
      return {
        rejected: { status: "rejected", reason: err.message, code: err.code },
      };
    }
    throw err;
  }

  try {
    await enforceActionScopeAndGraphIntegrity(
      actionEntry!,
      effects,
      { getNode: (nodeId) => ports.graph.getNode(nodeId) },
      {
        getNodeCatalogEntry: (nodeType) =>
          ports.catalog.getNodeCatalogEntry(nodeType),
        getEdgeCatalogEntry: (edgeType) =>
          ports.catalog.getEdgeCatalogEntry(edgeType),
      },
    );
    await enforceCatalogMutationIntegrity(actionType, effects, {
      getNodeCatalogEntry: (nodeType) =>
        ports.catalog.getNodeCatalogEntry(nodeType),
      getArchetype: (archetypeId) => ports.catalog.getArchetype(archetypeId),
      getPropertyCatalogEntry: (propertyKey) =>
        ports.catalog.getPropertyCatalogEntry(propertyKey),
      getActionCatalogEntry: (at) => ports.catalog.getActionCatalogEntry(at),
      getEdgeCatalogEntry: (edgeType) =>
        ports.catalog.getEdgeCatalogEntry(edgeType),
      getInstruction: (instructionId) =>
        ports.catalog.getInstruction(instructionId),
      hasNodesOfType: async (nodeType) => {
        const nodes = await ports.graph.queryNodes({ nodeType, limit: 1 });
        return nodes.length > 0;
      },
      hasEdgesOfType: async (edgeType) => {
        const nodes = await ports.graph.queryNodes({ limit: 100 });
        for (const node of nodes) {
          const edges = await ports.graph.traverseEdges({
            nodeId: node.id,
            direction: "both",
            edgeType,
          });
          if (edges.length > 0) return true;
        }
        return false;
      },
    });
  } catch (err) {
    if (err instanceof ActionRejectedError) {
      return {
        rejected: { status: "rejected", reason: err.message, code: err.code },
      };
    }
    throw err;
  }

  return { effects, resolvedInput, breakingChange, permissionGateReason };
}

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

  const prepared = await prepareAction(ports, params);
  if ("rejected" in prepared) {
    return prepared.rejected;
  }

  const { effects, breakingChange, permissionGateReason } = prepared;
  const actionEntry = await ports.catalog.getActionCatalogEntry(actionType);

  const existingNodes = new Map<string, Node>();
  for (const effect of effects) {
    if (effect.kind === "update_node") {
      const node = await ports.graph.getNode(effect.nodeId);
      if (node) existingNodes.set(effect.nodeId, node);
    }
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

  const needsGate =
    gateCheck.requiresGate ||
    Boolean(permissionGateReason) ||
    deviation.deviates ||
    (breakingChange && actionType === "update_node_type");

  if (needsGate && actionType !== "approve_gate") {
    const gateReason =
      gateCheck.reason ||
      permissionGateReason ||
      deviation.reason ||
      (breakingChange ? "Breaking node type change requires human approval" : "");

    const gate = await ports.gate.createGate({
      actionType,
      executorId,
      input,
      proposedEffects: effects,
      status: "pending",
      reason: gateReason,
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
        metadata: { scope: actionEntry?.scope ?? { kind: "global" } },
      },
    });

    return {
      status: "gated",
      gateId: gate.id,
      message: gateReason,
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
        metadata: { scope: actionEntry?.scope ?? { kind: "global" } },
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

export async function previewAction(
  ports: ActionPorts,
  params: ExecuteActionInput,
): Promise<ActionPreviewResult> {
  const prepared = await prepareAction(ports, params);
  if ("rejected" in prepared) {
    const r = prepared.rejected;
    if (r.status !== "rejected") {
      throw new Error("Unexpected prepareAction result");
    }
    return { status: "rejected", code: r.code, reason: r.reason };
  }

  const { effects, breakingChange, permissionGateReason } = prepared;
  const actionEntry = await ports.catalog.getActionCatalogEntry(params.actionType);
  const existingNodes = new Map<string, Node>();

  const gateCheck = enforceGateRules(
    actionEntry!,
    params.executorType,
    effects,
    new Map(),
    existingNodes,
  );

  const wouldGate =
    gateCheck.requiresGate ||
    Boolean(permissionGateReason) ||
    (breakingChange && params.actionType === "update_node_type");

  return {
    status: "ok",
    effects,
    wouldGate,
    gateReason:
      gateCheck.reason ||
      permissionGateReason ||
      (breakingChange ? "Breaking node type change requires human approval" : undefined),
  };
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
export * from "./domain/wire.js";
