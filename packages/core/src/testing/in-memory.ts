import { randomUUID } from "node:crypto";
import type {
  ActionCatalogEntry,
  ActionCommitPort,
  ActionLogRecord,
  ActionPorts,
  ActionPropertyPermission,
  Archetype,
  CatalogPort,
  CommitParams,
  CommitResult,
  Edge,
  EdgeCatalogEntry,
  Gate,
  GatePort,
  GraphReadPort,
  Instruction,
  Node,
  NodeCatalogEntry,
  PropertyCatalogEntry,
} from "../domain/types.js";
import type { Effect, GateStatus, LifecycleStatus } from "@loopos/contracts";

export interface InMemoryState {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  gates: Map<string, Gate>;
  actionLog: ActionLogRecord[];
  nodeCatalog: Map<string, NodeCatalogEntry>;
  actionCatalog: Map<string, ActionCatalogEntry>;
  archetypes: Map<string, Archetype>;
  permissions: ActionPropertyPermission[];
  instructions: Instruction[];
  edgeCatalog: Map<string, EdgeCatalogEntry>;
  propertyCatalog: Map<string, PropertyCatalogEntry>;
}

export function createInMemoryState(
  seed?: Partial<{
    nodeCatalog: NodeCatalogEntry[];
    actionCatalog: ActionCatalogEntry[];
    archetypes: Archetype[];
    permissions: ActionPropertyPermission[];
    instructions: Instruction[];
    edgeCatalog: EdgeCatalogEntry[];
    propertyCatalog: PropertyCatalogEntry[];
    nodes: Node[];
  }>,
): InMemoryState {
  const state: InMemoryState = {
    nodes: new Map(),
    edges: new Map(),
    gates: new Map(),
    actionLog: [],
    nodeCatalog: new Map(),
    actionCatalog: new Map(),
    archetypes: new Map(),
    permissions: [],
    instructions: [],
    edgeCatalog: new Map(),
    propertyCatalog: new Map(),
  };

  seed?.nodeCatalog?.forEach((e) => state.nodeCatalog.set(e.nodeType, e));
  seed?.actionCatalog?.forEach((e) => state.actionCatalog.set(e.actionType, e));
  seed?.archetypes?.forEach((a) => state.archetypes.set(a.id, a));
  seed?.permissions?.forEach((p) => state.permissions.push(p));
  seed?.instructions?.forEach((i) => state.instructions.push(i));
  seed?.edgeCatalog?.forEach((e) => state.edgeCatalog.set(e.edgeType, e));
  seed?.propertyCatalog?.forEach((e) =>
    state.propertyCatalog.set(e.propertyKey, e),
  );
  seed?.nodes?.forEach((n) => state.nodes.set(n.id, n));

  return state;
}

function applyEffect(state: InMemoryState, effect: Effect): void {
  const now = new Date();

  if (effect.kind === "create_node") {
    const id = effect.node.id ?? randomUUID();
    state.nodes.set(id, {
      id,
      nodeType: effect.node.nodeType,
      lifecycleStatus: effect.node.lifecycleStatus,
      properties: effect.node.properties,
      content: effect.node.content ?? null,
      contentUrl: effect.node.contentUrl ?? null,
      provenance: effect.node.provenance,
      createdAt: now,
      updatedAt: now,
    });
  } else if (effect.kind === "update_node") {
    const node = state.nodes.get(effect.nodeId);
    if (node) {
      state.nodes.set(effect.nodeId, {
        ...node,
        lifecycleStatus:
          effect.patch.lifecycleStatus ?? node.lifecycleStatus,
        properties: { ...node.properties, ...effect.patch.properties },
        content:
          effect.patch.content !== undefined
            ? effect.patch.content
            : node.content,
        contentUrl:
          effect.patch.contentUrl !== undefined
            ? effect.patch.contentUrl
            : node.contentUrl,
        updatedAt: now,
      });
    }
  } else if (effect.kind === "create_edge") {
    const id = effect.edge.id ?? randomUUID();
    state.edges.set(id, {
      id,
      edgeType: effect.edge.edgeType,
      sourceNodeId: effect.edge.sourceNodeId,
      targetNodeId: effect.edge.targetNodeId,
      properties: effect.edge.properties,
      createdAt: now,
    });
  } else if (effect.kind === "update_gate") {
    const gate = state.gates.get(effect.gateId);
    if (gate) {
      state.gates.set(effect.gateId, {
        ...gate,
        status: effect.status,
        decisionNote: effect.decisionNote ?? null,
      });

      if (effect.status === "approved") {
        for (const proposed of gate.proposedEffects) {
          applyEffect(state, proposed);
        }
      }
    }
  } else if (effect.kind === "upsert_node_catalog_entry") {
    state.nodeCatalog.set(effect.entry.nodeType, {
      nodeType: effect.entry.nodeType,
      family: effect.entry.family,
      archetypeId: effect.entry.archetypeId,
      typicalValueOverrides: effect.entry.typicalValueOverrides,
      lifecycleTransitions: effect.entry.lifecycleTransitions as Record<
        LifecycleStatus,
        LifecycleStatus[]
      >,
      contentGuide: effect.entry.contentGuide ?? null,
      propertyRefs: effect.entry.propertyRefs ?? [],
      allowedActionRefs: effect.entry.allowedActionRefs ?? [],
    });
  } else if (effect.kind === "deprecate_node_catalog_entry") {
    state.nodeCatalog.delete(effect.nodeType);
  } else if (effect.kind === "deprecate_edge_catalog_entry") {
    state.edgeCatalog.delete(effect.edgeType);
  } else if (effect.kind === "deprecate_property_catalog_entry") {
    state.propertyCatalog.delete(effect.propertyKey);
  } else if (effect.kind === "deprecate_action_catalog_entry") {
    state.actionCatalog.delete(effect.actionType);
  } else if (effect.kind === "deprecate_instruction_catalog_entry") {
    state.instructions = state.instructions.filter(
      (instruction) => instruction.id !== effect.instructionId,
    );
  } else if (effect.kind === "upsert_edge_catalog_entry") {
    state.edgeCatalog.set(effect.entry.edgeType, effect.entry);
  } else if (effect.kind === "upsert_property_catalog_entry") {
    state.propertyCatalog.set(effect.entry.propertyKey, effect.entry);
  } else if (effect.kind === "upsert_property_permission_entry") {
    const idx = state.permissions.findIndex(
      (permission) =>
        permission.actionType === effect.permission.actionType &&
        permission.nodeType === effect.permission.nodeType &&
        permission.propertyKey === effect.permission.propertyKey,
    );
    const next = {
      actionType: effect.permission.actionType,
      nodeType: effect.permission.nodeType,
      propertyKey: effect.permission.propertyKey,
      operation: effect.permission.operation,
      permissionType: effect.permission.permissionType,
      valueConstraint: effect.permission.valueConstraint ?? null,
      requiresHumanGate: effect.permission.requiresHumanGate,
      status: effect.permission.status,
    };
    if (idx >= 0) {
      state.permissions[idx] = next;
    } else {
      state.permissions.push(next);
    }
  } else if (effect.kind === "upsert_action_catalog_entry") {
    state.actionCatalog.set(effect.entry.actionType, {
      actionType: effect.entry.actionType,
      scope: effect.entry.scope,
      preconditions: effect.entry.preconditions,
      effects: effect.entry.effects as Effect[],
      executor: effect.entry.executor,
      allowedLifecycleTransitions: effect.entry.allowedLifecycleTransitions,
      failureMode: effect.entry.failureMode,
      idempotencyRule: effect.entry.idempotencyRule ?? null,
      logPayloadSchema: effect.entry.logPayloadSchema,
    });
  } else if (effect.kind === "upsert_instruction_catalog_entry") {
    if (effect.entry.instructionId) {
      const idx = state.instructions.findIndex(
        (instruction) => instruction.id === effect.entry.instructionId,
      );
      const next = {
        id: effect.entry.instructionId,
        title: effect.entry.title,
        triggerPatterns: effect.entry.triggerPatterns,
        applicableNodeTypes: effect.entry.applicableNodeTypes,
        requiredActions: effect.entry.requiredActions,
        optionalActions: effect.entry.optionalActions,
        lifecycle: effect.entry.lifecycle,
        body: effect.entry.body,
        scope: effect.entry.scope,
        triggers: effect.entry.triggers,
        workflowSteps: effect.entry.workflowSteps,
        allowedActions: effect.entry.allowedActions,
        outputContract: effect.entry.outputContract,
        gatePolicy: effect.entry.gatePolicy,
        completionCriteria: effect.entry.completionCriteria ?? null,
      };
      if (idx >= 0) {
        state.instructions[idx] = next;
      } else {
        state.instructions.push(next);
      }
    } else {
      state.instructions.push({
        id: randomUUID(),
        title: effect.entry.title,
        triggerPatterns: effect.entry.triggerPatterns,
        applicableNodeTypes: effect.entry.applicableNodeTypes,
        requiredActions: effect.entry.requiredActions,
        optionalActions: effect.entry.optionalActions,
        lifecycle: effect.entry.lifecycle,
        body: effect.entry.body,
        scope: effect.entry.scope,
        triggers: effect.entry.triggers,
        workflowSteps: effect.entry.workflowSteps,
        allowedActions: effect.entry.allowedActions,
        outputContract: effect.entry.outputContract,
        gatePolicy: effect.entry.gatePolicy,
        completionCriteria: effect.entry.completionCriteria ?? null,
      });
    }
  }
}

export function createInMemoryPorts(state: InMemoryState): ActionPorts {
  const catalog: CatalogPort = {
    async getNodeCatalogEntry(nodeType) {
      return state.nodeCatalog.get(nodeType) ?? null;
    },
    async listNodeCatalogEntries() {
      return [...state.nodeCatalog.values()];
    },
    async getEdgeCatalogEntry(edgeType) {
      return state.edgeCatalog.get(edgeType) ?? null;
    },
    async listEdgeCatalogEntries() {
      return [...state.edgeCatalog.values()];
    },
    async getPropertyCatalogEntry(propertyKey) {
      return state.propertyCatalog.get(propertyKey) ?? null;
    },
    async listPropertyCatalogEntries() {
      return [...state.propertyCatalog.values()];
    },
    async getActionCatalogEntry(actionType) {
      return state.actionCatalog.get(actionType) ?? null;
    },
    async listActionCatalogEntries() {
      return [...state.actionCatalog.values()];
    },
    async getArchetype(archetypeId) {
      return state.archetypes.get(archetypeId) ?? null;
    },
    async listArchetypes() {
      return [...state.archetypes.values()];
    },
    async getPropertyPermissions(actionType, nodeType) {
      return state.permissions.filter(
        (p) => p.actionType === actionType && p.nodeType === nodeType,
      );
    },
    async findInstructions(query, nodeType, limit = 5) {
      const q = query.toLowerCase();
      return state.instructions
        .filter(
          (i) =>
            (i.title.toLowerCase().includes(q) ||
              i.body.toLowerCase().includes(q)) &&
            (!nodeType || i.applicableNodeTypes.includes(nodeType)),
        )
        .slice(0, limit);
    },
    async listInstructions(input) {
      const limit = input?.limit ?? 100;
      return state.instructions.slice(0, limit);
    },
    async getInstruction(instructionId) {
      return (
        state.instructions.find((instruction) => instruction.id === instructionId) ??
        null
      );
    },
  };

  const graph: GraphReadPort = {
    async getNode(nodeId) {
      return state.nodes.get(nodeId) ?? null;
    },
    async queryNodes(params) {
      let results = [...state.nodes.values()];
      if (params.nodeType) {
        results = results.filter((n) => n.nodeType === params.nodeType);
      }
      if (params.lifecycleStatus) {
        results = results.filter(
          (n) => n.lifecycleStatus === params.lifecycleStatus,
        );
      }
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 20;
      return results.slice(offset, offset + limit);
    },
    async traverseEdges(params) {
      const results: Edge[] = [];
      for (const edge of state.edges.values()) {
        if (params.edgeType && edge.edgeType !== params.edgeType) continue;
        if (
          params.direction === "outgoing" ||
          params.direction === "both"
        ) {
          if (edge.sourceNodeId === params.nodeId) results.push(edge);
        }
        if (
          params.direction === "incoming" ||
          params.direction === "both"
        ) {
          if (edge.targetNodeId === params.nodeId) results.push(edge);
        }
      }
      return results;
    },
    async getEdgeCatalogEntry(edgeType) {
      return state.edgeCatalog.get(edgeType) ?? null;
    },
  };

  const gate: GatePort = {
    async listPendingGates() {
      return [...state.gates.values()].filter((g) => g.status === "pending");
    },
    async queryGates(params) {
      let results = [...state.gates.values()];
      if (params.status) {
        results = results.filter((g) => g.status === params.status);
      }
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 20;
      return results.slice(offset, offset + limit);
    },
    async getGate(gateId) {
      return state.gates.get(gateId) ?? null;
    },
    async createGate(g) {
      const id = randomUUID();
      const gate: Gate = {
        ...g,
        id,
        createdAt: new Date(),
        decisionNote: null,
      };
      state.gates.set(id, gate);
      return gate;
    },
  };

  const commit: ActionCommitPort = {
    async commit(params: CommitParams): Promise<CommitResult> {
      const logId = randomUUID();

      if (params.gateDecision) {
        applyEffect(state, {
          kind: "update_gate",
          gateId: params.gateDecision.gateId,
          status: params.gateDecision.status,
          decisionNote: params.gateDecision.decisionNote,
        });
      }

      for (const effect of params.effects) {
        applyEffect(state, effect);
      }

      state.actionLog.push({
        id: logId,
        actionType: params.logEntry.actionType,
        executorId: params.logEntry.executorId,
        executorType: params.logEntry.executorType,
        input: params.logEntry.input,
        effects: params.logEntry.effects,
        outcome: params.logEntry.outcome,
        rejectionReason: params.logEntry.rejectionReason ?? null,
        gateId: params.logEntry.gateId ?? null,
        idempotencyKey: params.logEntry.idempotencyKey ?? null,
        metadata: params.logEntry.metadata ?? {},
        createdAt: new Date(),
      });

      return { logId, appliedEffects: params.effects };
    },
    async getActionLog(params) {
      let results = [...state.actionLog];
      if (params.actionType) {
        results = results.filter((r) => r.actionType === params.actionType);
      }
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 20;
      return results.slice(offset, offset + limit);
    },
    async getActionLogEntry(logId) {
      return state.actionLog.find((r) => r.id === logId) ?? null;
    },
    async findByIdempotencyKey(key) {
      return (
        state.actionLog.find(
          (r) => r.idempotencyKey === key && r.outcome === "committed",
        ) ?? null
      );
    },
  };

  return { catalog, graph, gate, commit };
}

export function seedTestCatalog(state: InMemoryState): void {
  state.archetypes.set("doc-note", {
    id: "doc-note",
    name: "Note",
    family: "document",
    typicalValues: { temporality: "ephemeral", authority: "personal" },
    allowedMutations: ["update_content"],
  });

  state.nodeCatalog.set("Note", {
    nodeType: "Note",
    family: "document",
    archetypeId: "doc-note",
    typicalValueOverrides: {},
    lifecycleTransitions: {
      Draft: ["Active", "Archived"],
      Active: ["Archived", "Draft"],
      Archived: ["Active"],
      Deleted: [],
    },
    contentGuide: "Free-form note content",
    propertyRefs: [],
    allowedActionRefs: [],
  });

  state.actionCatalog.set("create_note", {
    actionType: "create_note",
    scope: { kind: "global" },
    preconditions: { requiredFields: ["content"] },
    effects: [
      {
        kind: "create_node",
        node: {
          nodeType: "Note",
          lifecycleStatus: "Draft",
          properties: {},
          content: null,
          contentUrl: null,
          provenance: {},
        },
      },
    ],
    executor: "Agent",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: "key",
    logPayloadSchema: {},
  });

  state.actionCatalog.set("promote_note", {
    actionType: "promote_note",
    scope: { kind: "global" },
    preconditions: { requiresExistingNode: true, requiredFields: ["nodeId"] },
    effects: [
      {
        kind: "update_node",
        nodeId: "",
        patch: { lifecycleStatus: "Active" },
      },
    ],
    executor: "Human",
    allowedLifecycleTransitions: { Draft: ["Active"] },
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  });

  state.actionCatalog.set("approve_gate", {
    actionType: "approve_gate",
    scope: { kind: "global" },
    preconditions: { requiredFields: ["gateId", "status"] },
    effects: [
      {
        kind: "update_gate",
        gateId: "",
        status: "approved",
      },
    ],
    executor: "Human",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  });

  const defaultTransitions: Record<LifecycleStatus, LifecycleStatus[]> = {
    Draft: ["Active", "Archived"],
    Active: ["Archived", "Draft"],
    Archived: ["Active"],
    Deleted: [],
  };

  state.actionCatalog.set("define_node_type", {
    actionType: "define_node_type",
    scope: { kind: "global" },
    preconditions: { requiredFields: ["definition"] },
    effects: [
      {
        kind: "upsert_node_catalog_entry",
        entry: {
          nodeType: "",
          family: "document",
          archetypeId: "",
          typicalValueOverrides: {},
          lifecycleTransitions: defaultTransitions,
          contentGuide: null,
          propertyRefs: [],
          allowedActionRefs: [],
        },
      },
    ],
    executor: "Human",
    allowedLifecycleTransitions: {},
    failureMode: "reject",
    idempotencyRule: null,
    logPayloadSchema: {},
  });

  state.permissions.push({
    actionType: "create_note",
    nodeType: "Note",
    propertyKey: "title",
    operation: "write",
    permissionType: "allow",
    valueConstraint: null,
    requiresHumanGate: false,
    status: "active",
  });

  state.propertyCatalog.set("title", {
    propertyKey: "title",
    valueType: "string",
    constraints: { maxLength: 500 },
    owningActions: ["create_note"],
  });
}

export function createTestNode(
  overrides?: Partial<Node> & { id?: string },
): Node {
  const id = overrides?.id ?? randomUUID();
  return {
    id,
    nodeType: "Note",
    lifecycleStatus: "Draft" as LifecycleStatus,
    properties: {},
    content: "test content",
    contentUrl: null,
    provenance: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestGate(
  overrides?: Partial<Gate> & { id?: string },
): Gate {
  return {
    id: overrides?.id ?? randomUUID(),
    actionType: "promote_note",
    executorId: "agent-1",
    input: { nodeId: randomUUID() },
    proposedEffects: [],
    status: "pending" as GateStatus,
    reason: "Human approval required",
    createdAt: new Date(),
    decisionNote: null,
    ...overrides,
  };
}
