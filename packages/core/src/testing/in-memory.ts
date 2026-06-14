import { randomUUID } from "node:crypto";
import type {
  ActionCatalogEntry,
  ActionCommitPort,
  ActionLogRecord,
  ActionPorts,
  ActionPortsScope,
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
  ImpactQueueClaimInput,
  ImpactQueueCreateInput,
  ImpactQueueItem,
  ImpactQueuePort,
  ImpactQueueQueryInput,
  Workflow,
  Node,
  NodeCatalogEntry,
} from "../domain/types.js";
import { DEFAULT_TITLE_FIELD, ensureTitleInPropertySchema } from "../catalog/property-schema.js";
import type { Effect, GateStatus, LifecycleStatus } from "@ssota/contracts";
import { parseWorkflowSpec } from "@ssota/contracts";
import {
  mergeActionCatalogEntries,
  mergeActionCatalogEntry,
  mergeActionCatalogEntryBySlug,
} from "../catalog/merge-action-catalog.js";
import { toCatalogLabel, toCatalogSlug } from "../catalog-slug.js";

export const TEST_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

export interface InMemoryState {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  gates: Map<string, Gate>;
  impactQueue: Map<string, ImpactQueueItem>;
  actionLog: ActionLogRecord[];
  nodeCatalog: Map<string, NodeCatalogEntry>;
  actionCatalog: Map<string, ActionCatalogEntry>;
  archetypes: Map<string, Archetype>;
  permissions: ActionPropertyPermission[];
  workflows: Workflow[];
  edgeCatalog: Map<string, EdgeCatalogEntry>;
}

export function createInMemoryState(
  seed?: Partial<{
    nodeCatalog: NodeCatalogEntry[];
    actionCatalog: ActionCatalogEntry[];
    archetypes: Archetype[];
    permissions: ActionPropertyPermission[];
    workflows: Workflow[];
    edgeCatalog: EdgeCatalogEntry[];
    nodes: Node[];
  }>,
): InMemoryState {
  const state: InMemoryState = {
    nodes: new Map(),
    edges: new Map(),
    gates: new Map(),
    impactQueue: new Map(),
    actionLog: [],
    nodeCatalog: new Map(),
    actionCatalog: new Map(),
    archetypes: new Map(),
    permissions: [],
    workflows: [],
    edgeCatalog: new Map(),
  };

  seed?.nodeCatalog?.forEach((e) => state.nodeCatalog.set(e.nodeType, e));
  seed?.actionCatalog?.forEach((e) => state.actionCatalog.set(e.actionType, e));
  seed?.archetypes?.forEach((a) => state.archetypes.set(a.id, a));
  seed?.permissions?.forEach((p) => state.permissions.push(p));
  seed?.workflows?.forEach((w) => state.workflows.push(w));
  seed?.edgeCatalog?.forEach((e) => state.edgeCatalog.set(e.edgeType, e));
  seed?.nodes?.forEach((n) => state.nodes.set(n.id, n));

  return state;
}

function applyEffect(
  state: InMemoryState,
  effect: Effect,
  projectId: string,
): void {
  const now = new Date();

  if (effect.kind === "create_node") {
    const id = effect.node.id ?? randomUUID();
    state.nodes.set(id, {
      id,
      projectId,
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
      projectId,
      edgeType: effect.edge.edgeType,
      sourceNodeId: effect.edge.sourceNodeId,
      targetNodeId: effect.edge.targetNodeId,
      properties: effect.edge.properties,
      createdAt: now,
    });
  } else if (effect.kind === "delete_node") {
    for (const [edgeId, edge] of state.edges) {
      if (
        edge.projectId === projectId &&
        (edge.sourceNodeId === effect.nodeId || edge.targetNodeId === effect.nodeId)
      ) {
        state.edges.delete(edgeId);
      }
    }
    for (const [queueId, item] of state.impactQueue) {
      if (
        item.projectId === projectId &&
        (item.sourceNodeId === effect.nodeId || item.targetNodeId === effect.nodeId)
      ) {
        state.impactQueue.delete(queueId);
      }
    }
    state.nodes.delete(effect.nodeId);
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
          applyEffect(state, proposed, projectId);
        }
      }
    }
  } else if (effect.kind === "upsert_node_catalog_entry") {
    state.nodeCatalog.set(effect.entry.nodeType, {
      nodeType: effect.entry.nodeType,
      slug: toCatalogSlug(effect.entry.nodeType),
      label: toCatalogLabel(effect.entry.nodeType),
      family: effect.entry.family,
      archetypeId: effect.entry.archetypeId ?? null,
      typicalValueOverrides: effect.entry.typicalValueOverrides,
      lifecycleTransitions: effect.entry.lifecycleTransitions as Record<
        LifecycleStatus,
        LifecycleStatus[]
      >,
      contentGuide: effect.entry.contentGuide ?? null,
      propertySchema: ensureTitleInPropertySchema(effect.entry.propertySchema),
      allowedActionRefs: effect.entry.allowedActionRefs ?? [],
    });
  } else if (effect.kind === "deprecate_node_catalog_entry") {
    state.nodeCatalog.delete(effect.nodeType);
  } else if (effect.kind === "deprecate_edge_catalog_entry") {
    state.edgeCatalog.delete(effect.edgeType);
  } else if (effect.kind === "deprecate_action_catalog_entry") {
    state.actionCatalog.delete(effect.actionType);
  } else if (effect.kind === "deprecate_workflow_catalog_entry") {
    state.workflows = state.workflows.filter(
      (workflow) => workflow.id !== effect.workflowId,
    );
  } else if (effect.kind === "upsert_edge_catalog_entry") {
    state.edgeCatalog.set(effect.entry.edgeType, {
      ...effect.entry,
      slug: toCatalogSlug(effect.entry.edgeType),
      label: toCatalogLabel(effect.entry.edgeType),
    });
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
      slug: toCatalogSlug(effect.entry.actionType),
      label: toCatalogLabel(effect.entry.actionType),
      scope: effect.entry.scope,
      preconditions: effect.entry.preconditions,
      effects: effect.entry.effects as Effect[],
      executor: effect.entry.executor,
      allowedLifecycleTransitions: effect.entry.allowedLifecycleTransitions,
      failureMode: effect.entry.failureMode,
      idempotencyRule: effect.entry.idempotencyRule ?? null,
      logPayloadSchema: effect.entry.logPayloadSchema,
    });
  } else if (effect.kind === "upsert_workflow_catalog_entry") {
    const spec = parseWorkflowSpec(effect.entry.spec);
    const slug = effect.entry.slug ?? toCatalogSlug(spec.title);
    const scope = effect.entry.scope as Workflow["scope"];
    if (effect.entry.workflowId) {
      const idx = state.workflows.findIndex(
        (workflow) => workflow.id === effect.entry.workflowId,
      );
      const next: Workflow = {
        id: effect.entry.workflowId,
        projectId,
        slug,
        workflowKey: effect.entry.workflowKey ?? null,
        lifecycle: effect.entry.lifecycle,
        scope,
        spec,
        createdAt: idx >= 0 ? state.workflows[idx]!.createdAt : now,
        updatedAt: now,
      };
      if (idx >= 0) {
        state.workflows[idx] = next;
      } else {
        state.workflows.push(next);
      }
    } else {
      state.workflows.push({
        id: randomUUID(),
        projectId,
        slug,
        workflowKey: effect.entry.workflowKey ?? spec.workflowKey ?? null,
        lifecycle: effect.entry.lifecycle,
        scope,
        spec,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

export function createInMemoryPorts(
  state: InMemoryState,
  scope?: ActionPortsScope,
): ActionPorts {
  const projectId = scope?.projectId ?? TEST_PROJECT_ID;

  const catalog: CatalogPort = {
    async getNodeCatalogEntry(nodeType) {
      return state.nodeCatalog.get(nodeType) ?? null;
    },
    async getNodeCatalogEntryBySlug(slug) {
      return (
        [...state.nodeCatalog.values()].find((entry) => entry.slug === slug) ??
        null
      );
    },
    async listNodeCatalogEntries() {
      return [...state.nodeCatalog.values()];
    },
    async getEdgeCatalogEntry(edgeType) {
      return state.edgeCatalog.get(edgeType) ?? null;
    },
    async getEdgeCatalogEntryBySlug(slug) {
      return (
        [...state.edgeCatalog.values()].find((entry) => entry.slug === slug) ??
        null
      );
    },
    async listEdgeCatalogEntries() {
      return [...state.edgeCatalog.values()];
    },
    async getActionCatalogEntry(actionType) {
      return mergeActionCatalogEntry(
        state.actionCatalog.get(actionType) ?? null,
        actionType,
      );
    },
    async getActionCatalogEntryBySlug(slug) {
      return mergeActionCatalogEntryBySlug(
        [...state.actionCatalog.values()].find((entry) => entry.slug === slug) ??
          null,
        slug,
      );
    },
    async listActionCatalogEntries() {
      return mergeActionCatalogEntries([...state.actionCatalog.values()]);
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
    async findWorkflows(query, nodeType, limit = 5) {
      const q = query.toLowerCase();
      return state.workflows
        .filter(
          (workflow) =>
            (workflow.spec.title.toLowerCase().includes(q) ||
              (workflow.spec.agentNotes?.toLowerCase().includes(q) ?? false) ||
              (workflow.workflowKey?.toLowerCase().includes(q) ?? false)) &&
            (!nodeType || workflow.spec.applicableNodeTypes.includes(nodeType)),
        )
        .slice(0, limit);
    },
    async listWorkflows(input) {
      const limit = input?.limit ?? 100;
      return state.workflows.slice(0, limit);
    },
    async getWorkflow(workflowId) {
      return (
        state.workflows.find((workflow) => workflow.id === workflowId) ?? null
      );
    },
    async getWorkflowBySlug(slug) {
      return state.workflows.find((workflow) => workflow.slug === slug) ?? null;
    },
    async getWorkflowByKey(workflowKey) {
      return (
        state.workflows.find((workflow) => workflow.workflowKey === workflowKey) ??
        null
      );
    },
  };

  const graph: GraphReadPort = {
    async getNode(nodeId) {
      const node = state.nodes.get(nodeId);
      return node?.projectId === projectId ? node : null;
    },
    async queryNodes(params) {
      let results = [...state.nodes.values()].filter(
        (n) => n.projectId === projectId,
      );
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
        if (edge.projectId !== projectId) continue;
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
      return [...state.gates.values()].filter(
        (g) => g.projectId === projectId && g.status === "pending",
      );
    },
    async queryGates(params) {
      let results = [...state.gates.values()].filter(
        (g) => g.projectId === projectId,
      );
      if (params.status) {
        results = results.filter((g) => g.status === params.status);
      }
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 20;
      return results.slice(offset, offset + limit);
    },
    async getGate(gateId) {
      const gate = state.gates.get(gateId);
      return gate?.projectId === projectId ? gate : null;
    },
    async createGate(g) {
      const id = randomUUID();
      const gate: Gate = {
        ...g,
        projectId,
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
        applyEffect(
          state,
          {
            kind: "update_gate",
            gateId: params.gateDecision.gateId,
            status: params.gateDecision.status,
            decisionNote: params.gateDecision.decisionNote,
          },
          projectId,
        );
      }

      for (const effect of params.effects) {
        applyEffect(state, effect, projectId);
      }

      state.actionLog.push({
        id: logId,
        projectId,
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
      let results = state.actionLog.filter((r) => r.projectId === projectId);
      if (params.actionType) {
        results = results.filter((r) => r.actionType === params.actionType);
      }
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 20;
      return results.slice(offset, offset + limit);
    },
    async getActionLogEntry(logId) {
      const entry = state.actionLog.find((r) => r.id === logId);
      return entry?.projectId === projectId ? entry : null;
    },
    async findByIdempotencyKey(key) {
      return (
        state.actionLog.find(
          (r) =>
            r.projectId === projectId &&
            r.idempotencyKey === key &&
            r.outcome === "committed",
        ) ?? null
      );
    },
  };

  const impactQueue = createInMemoryImpactQueuePort(state, projectId);

  return { catalog, graph, gate, commit, impactQueue };
}

function createInMemoryImpactQueuePort(
  state: InMemoryState,
  projectId: string,
): ImpactQueuePort {
  function now(): Date {
    return new Date();
  }

  function sortForClaim(a: ImpactQueueItem, b: ImpactQueueItem): number {
    return (
      b.priority - a.priority ||
      a.runAt.getTime() - b.runAt.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  function queryItems(params?: ImpactQueueQueryInput): ImpactQueueItem[] {
    let items = [...state.impactQueue.values()].filter(
      (item) => item.projectId === projectId,
    );
    if (params?.status) {
      items = items.filter((item) => item.status === params.status);
    }
    if (params?.workflowKey) {
      items = items.filter((item) => item.workflowKey === params.workflowKey);
    }
    return items.slice(params?.offset ?? 0, (params?.offset ?? 0) + (params?.limit ?? 20));
  }

  return {
    async enqueueImpact(input: ImpactQueueCreateInput) {
      const existing = [...state.impactQueue.values()].find(
        (item) =>
          item.projectId === projectId &&
          item.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return existing;

      const createdAt = now();
      const item: ImpactQueueItem = {
        id: randomUUID(),
        projectId,
        sourceActionLogId: input.sourceActionLogId,
        sourceNodeId: input.sourceNodeId ?? null,
        targetNodeId: input.targetNodeId ?? null,
        dependencyEdgeId: input.dependencyEdgeId ?? null,
        workflowKey: input.workflowKey,
        workflowId: input.workflowId ?? null,
        status: "pending",
        priority: input.priority ?? 0,
        runAt: input.runAt ?? createdAt,
        lockedBy: null,
        lockedUntil: null,
        attemptCount: 0,
        maxAttempts: input.maxAttempts ?? 5,
        idempotencyKey: input.idempotencyKey,
        lastError: null,
        payload: input.payload ?? {},
        result: {},
        createdAt,
        updatedAt: createdAt,
        completedAt: null,
      };
      state.impactQueue.set(item.id, item);
      return item;
    },

    async claimImpactQueue(input: ImpactQueueClaimInput) {
      const currentTime = input.now ?? now();
      const lockMs = input.lockMs ?? 5 * 60 * 1000;
      const limit = input.limit ?? 1;
      const available = [...state.impactQueue.values()]
        .filter((item) => {
          if (item.projectId !== projectId) return false;
          if (item.runAt > currentTime) return false;
          if (item.status === "pending" || item.status === "failed") return true;
          return (
            item.status === "running" &&
            item.lockedUntil !== null &&
            item.lockedUntil <= currentTime
          );
        })
        .sort(sortForClaim)
        .slice(0, limit);

      return available.map((item) => {
        const updated: ImpactQueueItem = {
          ...item,
          status: "running",
          lockedBy: input.workerId,
          lockedUntil: new Date(currentTime.getTime() + lockMs),
          attemptCount: item.attemptCount + 1,
          updatedAt: currentTime,
        };
        state.impactQueue.set(item.id, updated);
        return updated;
      });
    },

    async completeImpactQueue(queueId, result = {}) {
      const item = state.impactQueue.get(queueId);
      if (!item || item.projectId !== projectId) return null;
      const updated: ImpactQueueItem = {
        ...item,
        status: "succeeded",
        lockedBy: null,
        lockedUntil: null,
        result,
        updatedAt: now(),
        completedAt: now(),
      };
      state.impactQueue.set(queueId, updated);
      return updated;
    },

    async failImpactQueue(queueId, error, retryAt) {
      const item = state.impactQueue.get(queueId);
      if (!item || item.projectId !== projectId) return null;
      const currentTime = now();
      const willRetry = item.attemptCount < item.maxAttempts;
      const updated: ImpactQueueItem = {
        ...item,
        status: willRetry ? "failed" : "dead",
        lockedBy: null,
        lockedUntil: null,
        runAt: willRetry ? (retryAt ?? currentTime) : item.runAt,
        lastError: error,
        updatedAt: currentTime,
        completedAt: willRetry ? null : currentTime,
      };
      state.impactQueue.set(queueId, updated);
      return updated;
    },

    async skipImpactQueue(queueId, result = {}) {
      const item = state.impactQueue.get(queueId);
      if (!item || item.projectId !== projectId) return null;
      const currentTime = now();
      const updated: ImpactQueueItem = {
        ...item,
        status: "skipped",
        lockedBy: null,
        lockedUntil: null,
        result,
        updatedAt: currentTime,
        completedAt: currentTime,
      };
      state.impactQueue.set(queueId, updated);
      return updated;
    },

    async queryImpactQueue(params) {
      return queryItems(params);
    },

    async getImpactQueueItem(queueId) {
      const item = state.impactQueue.get(queueId);
      return item?.projectId === projectId ? item : null;
    },
  };
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
    slug: "note",
    label: "Note",
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
    propertySchema: { title: { ...DEFAULT_TITLE_FIELD } },
    allowedActionRefs: [],
  });

  state.actionCatalog.set("promote_note", {
    actionType: "promote_note",
    slug: "promote_note",
    label: "Promote Note",
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

  state.permissions.push({
    actionType: "create_node",
    nodeType: "Note",
    propertyKey: "title",
    operation: "create",
    permissionType: "allow",
    valueConstraint: null,
    requiresHumanGate: false,
    status: "active",
  });
}

export function createTestNode(
  overrides?: Partial<Node> & { id?: string },
): Node {
  const id = overrides?.id ?? randomUUID();
  return {
    id,
    projectId: TEST_PROJECT_ID,
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
    projectId: TEST_PROJECT_ID,
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
