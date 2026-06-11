import { eq, and, or, sql } from "drizzle-orm";
import { toCatalogLabel, toCatalogSlug } from "@loopos/core";
import type {
  ActionScope,
  Effect,
  GateStatus,
  InstructionScope,
  InstructionWorkflowStep,
  LifecycleStatus,
} from "@loopos/contracts";
import type {
  ActionCommitPort,
  ActionLogRecord,
  ActionPorts,
  ActionPropertyPermission,
  ActionCatalogEntry,
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
} from "@loopos/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

function mapNode(row: typeof schema.nodes.$inferSelect): Node {
  return {
    id: row.id,
    nodeType: row.nodeType,
    lifecycleStatus: row.lifecycleStatus as LifecycleStatus,
    properties: row.properties,
    content: row.content,
    contentUrl: row.contentUrl,
    provenance: row.provenance,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapNodeCatalogEntry(
  row: typeof schema.nodeCatalog.$inferSelect,
): NodeCatalogEntry {
  return {
    nodeType: row.nodeType,
    slug: row.slug,
    label: row.label,
    family: row.family,
    archetypeId: row.archetypeId,
    typicalValueOverrides: row.typicalValueOverrides,
    lifecycleTransitions: row.lifecycleTransitions as Record<
      LifecycleStatus,
      LifecycleStatus[]
    >,
    contentGuide: row.contentGuide,
    propertyRefs: row.propertyRefs ?? [],
    allowedActionRefs: row.allowedActionRefs ?? [],
  };
}

function mapActionCatalogEntry(
  row: typeof schema.actionCatalog.$inferSelect,
): ActionCatalogEntry {
  return {
    actionType: row.actionType,
    slug: row.slug,
    label: row.label,
    scope: row.scope as ActionScope,
    preconditions: row.preconditions,
    effects: row.effects as Effect[],
    executor: row.executor,
    allowedLifecycleTransitions: row.allowedLifecycleTransitions as Record<
      string,
      LifecycleStatus[]
    >,
    failureMode: row.failureMode,
    idempotencyRule: row.idempotencyRule,
    logPayloadSchema: row.logPayloadSchema,
  };
}

function mapEdgeCatalogEntry(
  row: typeof schema.edgeCatalog.$inferSelect,
): EdgeCatalogEntry {
  return {
    edgeType: row.edgeType,
    slug: row.slug,
    label: row.label,
    domain: row.domain,
    range: row.range,
    cardinality: row.cardinality,
    representation: row.representation,
  };
}

function mapInstruction(row: typeof schema.instructions.$inferSelect): Instruction {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    triggerPatterns: row.triggerPatterns,
    applicableNodeTypes: row.applicableNodeTypes,
    requiredActions: row.requiredActions,
    optionalActions: row.optionalActions,
    lifecycle: row.lifecycle as LifecycleStatus,
    body: row.body,
    scope: row.scope as InstructionScope,
    triggers: row.triggers,
    workflowSteps: row.workflowSteps as InstructionWorkflowStep[],
    allowedActions: row.allowedActions,
    outputContract: row.outputContract,
    gatePolicy: row.gatePolicy,
    completionCriteria: row.completionCriteria,
  };
}

export function createCatalogPort(db: Db): CatalogPort {
  return {
    async getNodeCatalogEntry(nodeType) {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(eq(schema.nodeCatalog.nodeType, nodeType))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapNodeCatalogEntry(row);
    },

    async getNodeCatalogEntryBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(eq(schema.nodeCatalog.slug, slug))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapNodeCatalogEntry(row);
    },

    async listNodeCatalogEntries() {
      const rows = await db.select().from(schema.nodeCatalog);
      return rows.map(mapNodeCatalogEntry);
    },

    async getEdgeCatalogEntry(edgeType) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(eq(schema.edgeCatalog.edgeType, edgeType))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapEdgeCatalogEntry(row);
    },

    async getEdgeCatalogEntryBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(eq(schema.edgeCatalog.slug, slug))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapEdgeCatalogEntry(row);
    },

    async listEdgeCatalogEntries() {
      const rows = await db.select().from(schema.edgeCatalog);
      return rows.map(mapEdgeCatalogEntry);
    },

    async getPropertyCatalogEntry(propertyKey) {
      const rows = await db
        .select()
        .from(schema.propertyCatalog)
        .where(eq(schema.propertyCatalog.propertyKey, propertyKey))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        propertyKey: row.propertyKey,
        valueType: row.valueType,
        constraints: row.constraints,
        owningActions: row.owningActions,
      } satisfies PropertyCatalogEntry;
    },

    async listPropertyCatalogEntries() {
      const rows = await db.select().from(schema.propertyCatalog);
      return rows.map(
        (row) =>
          ({
            propertyKey: row.propertyKey,
            valueType: row.valueType,
            constraints: row.constraints,
            owningActions: row.owningActions,
          }) satisfies PropertyCatalogEntry,
      );
    },

    async getActionCatalogEntry(actionType) {
      const rows = await db
        .select()
        .from(schema.actionCatalog)
        .where(eq(schema.actionCatalog.actionType, actionType))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapActionCatalogEntry(row);
    },

    async getActionCatalogEntryBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.actionCatalog)
        .where(eq(schema.actionCatalog.slug, slug))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapActionCatalogEntry(row);
    },

    async listActionCatalogEntries() {
      const rows = await db.select().from(schema.actionCatalog);
      return rows.map(mapActionCatalogEntry);
    },

    async getArchetype(archetypeId) {
      const rows = await db
        .select()
        .from(schema.archetypes)
        .where(eq(schema.archetypes.id, archetypeId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        family: row.family,
        typicalValues: row.typicalValues,
        allowedMutations: row.allowedMutations,
      } satisfies Archetype;
    },

    async listArchetypes() {
      const rows = await db.select().from(schema.archetypes);
      return rows.map(
        (row) =>
          ({
            id: row.id,
            name: row.name,
            family: row.family,
            typicalValues: row.typicalValues,
            allowedMutations: row.allowedMutations,
          }) satisfies Archetype,
      );
    },

    async getPropertyPermissions(actionType, nodeType) {
      const rows = await db
        .select()
        .from(schema.actionPropertyPermissions)
        .where(
          and(
            eq(schema.actionPropertyPermissions.actionType, actionType),
            eq(schema.actionPropertyPermissions.nodeType, nodeType),
          ),
        );
      return rows.map(
        (row) =>
          ({
            actionType: row.actionType,
            nodeType: row.nodeType,
            propertyKey: row.propertyKey,
            operation: row.operation,
            permissionType: row.permissionType,
            valueConstraint: row.valueConstraint,
            requiresHumanGate: row.requiresHumanGate,
            status: row.status,
          }) satisfies ActionPropertyPermission,
      );
    },

    async findInstructions(query, nodeType, limit = 5) {
      const pattern = `%${query.toLowerCase()}%`;
      const rows = await db
        .select()
        .from(schema.instructions)
        .where(
          and(
            or(
              sql`lower(${schema.instructions.title}) like ${pattern}`,
              sql`lower(${schema.instructions.body}) like ${pattern}`,
            ),
            nodeType
              ? sql`${schema.instructions.applicableNodeTypes} @> ${JSON.stringify([nodeType])}::jsonb`
              : undefined,
          ),
        )
        .limit(limit);

      return rows.map(mapInstruction);
    },

    async listInstructions(input) {
      const rows = await db
        .select()
        .from(schema.instructions)
        .limit(input?.limit ?? 100);
      return rows.map(mapInstruction);
    },

    async getInstruction(instructionId) {
      const rows = await db
        .select()
        .from(schema.instructions)
        .where(eq(schema.instructions.id, instructionId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapInstruction(row);
    },

    async getInstructionBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.instructions)
        .where(eq(schema.instructions.slug, slug))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapInstruction(row);
    },
  };
}

export function createGraphReadPort(db: Db): GraphReadPort {
  return {
    async getNode(nodeId) {
      const rows = await db
        .select()
        .from(schema.nodes)
        .where(eq(schema.nodes.id, nodeId))
        .limit(1);
      const row = rows[0];
      return row ? mapNode(row) : null;
    },

    async queryNodes(params) {
      let query = db.select().from(schema.nodes).$dynamic();
      const conditions = [];
      if (params.nodeType) {
        conditions.push(eq(schema.nodes.nodeType, params.nodeType));
      }
      if (params.lifecycleStatus) {
        conditions.push(
          eq(schema.nodes.lifecycleStatus, params.lifecycleStatus),
        );
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      const rows = await query
        .limit(params.limit ?? 20)
        .offset(params.offset ?? 0);
      return rows.map(mapNode);
    },

    async traverseEdges(params) {
      const conditions = [];
      if (params.edgeType) {
        conditions.push(eq(schema.edges.edgeType, params.edgeType));
      }

      const outgoing =
        params.direction === "outgoing" || params.direction === "both"
          ? db
              .select()
              .from(schema.edges)
              .where(
                and(
                  eq(schema.edges.sourceNodeId, params.nodeId),
                  ...(conditions.length ? conditions : []),
                ),
              )
          : Promise.resolve([]);

      const incoming =
        params.direction === "incoming" || params.direction === "both"
          ? db
              .select()
              .from(schema.edges)
              .where(
                and(
                  eq(schema.edges.targetNodeId, params.nodeId),
                  ...(conditions.length ? conditions : []),
                ),
              )
          : Promise.resolve([]);

      const [outRows, inRows] = await Promise.all([outgoing, incoming]);
      const all = [...outRows, ...inRows];

      return all.map(
        (row) =>
          ({
            id: row.id,
            edgeType: row.edgeType,
            sourceNodeId: row.sourceNodeId,
            targetNodeId: row.targetNodeId,
            properties: row.properties,
            createdAt: row.createdAt,
          }) satisfies Edge,
      );
    },

    async getEdgeCatalogEntry(edgeType) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(eq(schema.edgeCatalog.edgeType, edgeType))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapEdgeCatalogEntry(row);
    },
  };
}

export { createConsolePort } from "./console.js";

export function createGatePort(db: Db): GatePort {
  return {
    async listPendingGates() {
      const rows = await db
        .select()
        .from(schema.gates)
        .where(eq(schema.gates.status, "pending"));
      return rows.map(mapGate);
    },

    async queryGates(params) {
      let query = db.select().from(schema.gates).$dynamic();
      if (params.status) {
        query = query.where(eq(schema.gates.status, params.status));
      }
      const rows = await query
        .orderBy(sql`${schema.gates.createdAt} desc`)
        .limit(params.limit ?? 20)
        .offset(params.offset ?? 0);
      return rows.map(mapGate);
    },

    async getGate(gateId) {
      const rows = await db
        .select()
        .from(schema.gates)
        .where(eq(schema.gates.id, gateId))
        .limit(1);
      const row = rows[0];
      return row ? mapGate(row) : null;
    },

    async createGate(g) {
      const rows = await db
        .insert(schema.gates)
        .values({
          actionType: g.actionType,
          executorId: g.executorId,
          input: g.input,
          proposedEffects: g.proposedEffects,
          status: g.status,
          reason: g.reason,
        })
        .returning();
      return mapGate(rows[0]!);
    },
  };
}

function mapGate(row: typeof schema.gates.$inferSelect): Gate {
  return {
    id: row.id,
    actionType: row.actionType,
    executorId: row.executorId,
    input: row.input,
    proposedEffects: row.proposedEffects as Effect[],
    status: row.status as GateStatus,
    reason: row.reason,
    createdAt: row.createdAt,
    decisionNote: row.decisionNote,
  };
}

async function applyEffect(tx: Db, effect: Effect): Promise<void> {
  if (effect.kind === "create_node") {
    await tx.insert(schema.nodes).values({
      nodeType: effect.node.nodeType,
      lifecycleStatus: effect.node.lifecycleStatus,
      properties: effect.node.properties,
      content: effect.node.content ?? null,
      contentUrl: effect.node.contentUrl ?? null,
      provenance: effect.node.provenance,
    });
  } else if (effect.kind === "update_node") {
    const patch: Partial<typeof schema.nodes.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (effect.patch.lifecycleStatus) {
      patch.lifecycleStatus = effect.patch.lifecycleStatus;
    }
    if (effect.patch.properties) {
      const existing = await tx
        .select()
        .from(schema.nodes)
        .where(eq(schema.nodes.id, effect.nodeId))
        .limit(1);
      const node = existing[0];
      if (node) {
        patch.properties = { ...node.properties, ...effect.patch.properties };
      }
    }
    if (effect.patch.content !== undefined) {
      patch.content = effect.patch.content;
    }
    if (effect.patch.contentUrl !== undefined) {
      patch.contentUrl = effect.patch.contentUrl;
    }
    await tx
      .update(schema.nodes)
      .set(patch)
      .where(eq(schema.nodes.id, effect.nodeId));
  } else if (effect.kind === "create_edge") {
    await tx.insert(schema.edges).values({
      edgeType: effect.edge.edgeType,
      sourceNodeId: effect.edge.sourceNodeId,
      targetNodeId: effect.edge.targetNodeId,
      properties: effect.edge.properties,
    });
  } else if (effect.kind === "update_gate") {
    await tx
      .update(schema.gates)
      .set({
        status: effect.status,
        decisionNote: effect.decisionNote ?? null,
      })
      .where(eq(schema.gates.id, effect.gateId));

    if (effect.status === "approved") {
      const gateRows = await tx
        .select()
        .from(schema.gates)
        .where(eq(schema.gates.id, effect.gateId))
        .limit(1);
      const gate = gateRows[0];
      if (gate) {
        for (const proposed of gate.proposedEffects as Effect[]) {
          await applyEffect(tx, proposed);
        }
      }
    }
  } else if (effect.kind === "upsert_node_catalog_entry") {
    const slug = toCatalogSlug(effect.entry.nodeType);
    const label = toCatalogLabel(effect.entry.nodeType);
    await tx
      .insert(schema.nodeCatalog)
      .values({
        nodeType: effect.entry.nodeType,
        slug,
        label,
        family: effect.entry.family,
        archetypeId: effect.entry.archetypeId,
        typicalValueOverrides: effect.entry.typicalValueOverrides,
        lifecycleTransitions: effect.entry.lifecycleTransitions,
        contentGuide: effect.entry.contentGuide ?? null,
        propertyRefs: effect.entry.propertyRefs ?? [],
        allowedActionRefs: effect.entry.allowedActionRefs ?? [],
      })
      .onConflictDoUpdate({
        target: schema.nodeCatalog.nodeType,
        set: {
          family: effect.entry.family,
          archetypeId: effect.entry.archetypeId,
          typicalValueOverrides: effect.entry.typicalValueOverrides,
          lifecycleTransitions: effect.entry.lifecycleTransitions,
          contentGuide: effect.entry.contentGuide ?? null,
          propertyRefs: effect.entry.propertyRefs ?? [],
          allowedActionRefs: effect.entry.allowedActionRefs ?? [],
        },
      });
  } else if (effect.kind === "deprecate_node_catalog_entry") {
    await tx
      .delete(schema.nodeCatalog)
      .where(eq(schema.nodeCatalog.nodeType, effect.nodeType));
  } else if (effect.kind === "deprecate_edge_catalog_entry") {
    await tx
      .delete(schema.edgeCatalog)
      .where(eq(schema.edgeCatalog.edgeType, effect.edgeType));
  } else if (effect.kind === "deprecate_property_catalog_entry") {
    await tx
      .delete(schema.propertyCatalog)
      .where(eq(schema.propertyCatalog.propertyKey, effect.propertyKey));
  } else if (effect.kind === "deprecate_action_catalog_entry") {
    await tx
      .delete(schema.actionCatalog)
      .where(eq(schema.actionCatalog.actionType, effect.actionType));
  } else if (effect.kind === "deprecate_instruction_catalog_entry") {
    await tx
      .delete(schema.instructions)
      .where(eq(schema.instructions.id, effect.instructionId));
  } else if (effect.kind === "upsert_edge_catalog_entry") {
    const slug = toCatalogSlug(effect.entry.edgeType);
    const label = toCatalogLabel(effect.entry.edgeType);
    await tx
      .insert(schema.edgeCatalog)
      .values({
        edgeType: effect.entry.edgeType,
        slug,
        label,
        domain: effect.entry.domain,
        range: effect.entry.range,
        cardinality: effect.entry.cardinality,
        representation: effect.entry.representation,
      })
      .onConflictDoUpdate({
        target: schema.edgeCatalog.edgeType,
        set: {
          domain: effect.entry.domain,
          range: effect.entry.range,
          cardinality: effect.entry.cardinality,
          representation: effect.entry.representation,
        },
      });
  } else if (effect.kind === "upsert_property_catalog_entry") {
    await tx
      .insert(schema.propertyCatalog)
      .values({
        propertyKey: effect.entry.propertyKey,
        valueType: effect.entry.valueType,
        constraints: effect.entry.constraints,
        owningActions: effect.entry.owningActions,
      })
      .onConflictDoUpdate({
        target: schema.propertyCatalog.propertyKey,
        set: {
          valueType: effect.entry.valueType,
          constraints: effect.entry.constraints,
          owningActions: effect.entry.owningActions,
        },
      });
  } else if (effect.kind === "upsert_property_permission_entry") {
    const existing = await tx
      .select()
      .from(schema.actionPropertyPermissions)
      .where(
        and(
          eq(schema.actionPropertyPermissions.actionType, effect.permission.actionType),
          eq(schema.actionPropertyPermissions.nodeType, effect.permission.nodeType),
          eq(schema.actionPropertyPermissions.propertyKey, effect.permission.propertyKey),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await tx
        .update(schema.actionPropertyPermissions)
        .set({
          operation: effect.permission.operation,
          permissionType: effect.permission.permissionType,
          valueConstraint: effect.permission.valueConstraint ?? null,
          requiresHumanGate: effect.permission.requiresHumanGate,
          status: effect.permission.status,
        })
        .where(eq(schema.actionPropertyPermissions.id, existing[0].id));
    } else {
      await tx.insert(schema.actionPropertyPermissions).values({
        actionType: effect.permission.actionType,
        nodeType: effect.permission.nodeType,
        propertyKey: effect.permission.propertyKey,
        operation: effect.permission.operation,
        permissionType: effect.permission.permissionType,
        valueConstraint: effect.permission.valueConstraint ?? null,
        requiresHumanGate: effect.permission.requiresHumanGate,
        status: effect.permission.status,
      });
    }
  } else if (effect.kind === "upsert_action_catalog_entry") {
    const slug = toCatalogSlug(effect.entry.actionType);
    const label = toCatalogLabel(effect.entry.actionType);
    await tx
      .insert(schema.actionCatalog)
      .values({
        actionType: effect.entry.actionType,
        slug,
        label,
        scope: effect.entry.scope,
        preconditions: effect.entry.preconditions,
        effects: effect.entry.effects,
        executor: effect.entry.executor,
        allowedLifecycleTransitions: effect.entry.allowedLifecycleTransitions,
        failureMode: effect.entry.failureMode,
        idempotencyRule: effect.entry.idempotencyRule ?? null,
        logPayloadSchema: effect.entry.logPayloadSchema,
      })
      .onConflictDoUpdate({
        target: schema.actionCatalog.actionType,
        set: {
          preconditions: effect.entry.preconditions,
          scope: effect.entry.scope,
          effects: effect.entry.effects,
          executor: effect.entry.executor,
          allowedLifecycleTransitions: effect.entry.allowedLifecycleTransitions,
          failureMode: effect.entry.failureMode,
          idempotencyRule: effect.entry.idempotencyRule ?? null,
          logPayloadSchema: effect.entry.logPayloadSchema,
        },
      });
  } else if (effect.kind === "upsert_instruction_catalog_entry") {
    if (effect.entry.instructionId) {
      await tx
        .update(schema.instructions)
        .set({
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
        })
        .where(eq(schema.instructions.id, effect.entry.instructionId));
    } else {
      const slug = toCatalogSlug(effect.entry.title);
      await tx.insert(schema.instructions).values({
        slug,
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

export function createActionCommitPort(db: Db): ActionCommitPort {
  return {
    async commit(params: CommitParams): Promise<CommitResult> {
      return db.transaction(async (tx) => {
        if (params.gateDecision) {
          await applyEffect(tx as unknown as Db, {
            kind: "update_gate",
            gateId: params.gateDecision.gateId,
            status: params.gateDecision.status,
            decisionNote: params.gateDecision.decisionNote,
          });
        }

        for (const effect of params.effects) {
          await applyEffect(tx as unknown as Db, effect);
        }

        const logRows = await tx
          .insert(schema.actionLog)
          .values({
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
          })
          .returning();

        return {
          logId: logRows[0]!.id,
          appliedEffects: params.effects,
        };
      });
    },

    async getActionLog(params) {
      let query = db.select().from(schema.actionLog).$dynamic();
      if (params.actionType) {
        query = query.where(eq(schema.actionLog.actionType, params.actionType));
      }
      const rows = await query
        .orderBy(sql`${schema.actionLog.createdAt} desc`)
        .limit(params.limit ?? 20)
        .offset(params.offset ?? 0);

      return rows.map(mapLogRecord);
    },

    async getActionLogEntry(logId) {
      const rows = await db
        .select()
        .from(schema.actionLog)
        .where(eq(schema.actionLog.id, logId))
        .limit(1);
      const row = rows[0];
      return row ? mapLogRecord(row) : null;
    },

    async findByIdempotencyKey(key) {
      const rows = await db
        .select()
        .from(schema.actionLog)
        .where(
          and(
            eq(schema.actionLog.idempotencyKey, key),
            eq(schema.actionLog.outcome, "committed"),
          ),
        )
        .limit(1);
      const row = rows[0];
      return row ? mapLogRecord(row) : null;
    },
  };
}

function mapLogRecord(row: typeof schema.actionLog.$inferSelect): ActionLogRecord {
  return {
    id: row.id,
    actionType: row.actionType,
    executorId: row.executorId,
    executorType: row.executorType,
    input: row.input,
    effects: row.effects as Effect[],
    outcome: row.outcome,
    rejectionReason: row.rejectionReason,
    gateId: row.gateId,
    idempotencyKey: row.idempotencyKey,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export function createActionPorts(db: Db): ActionPorts {
  return {
    catalog: createCatalogPort(db),
    graph: createGraphReadPort(db),
    gate: createGatePort(db),
    commit: createActionCommitPort(db),
  };
}
