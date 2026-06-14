import { asc, desc, eq, and, inArray, lte, or, sql } from "drizzle-orm";
import {
  mergeActionCatalogEntries,
  mergeActionCatalogEntry,
  mergeActionCatalogEntryBySlug,
  toCatalogLabel,
  toCatalogSlug,
} from "@ssota/core";
import {
  normalizeInstructionTriggerEvents,
  type ActionScope,
  type Effect,
  type GateStatus,
  type InstructionScope,
  type InstructionWorkflowStep,
  type LifecycleStatus,
} from "@ssota/contracts";
import type {
  ActionCommitPort,
  ActionLogRecord,
  ActionPorts,
  ActionPortsScope,
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
  ImpactQueueClaimInput,
  ImpactQueueCreateInput,
  ImpactQueueItem,
  ImpactQueuePort,
  ImpactQueueQueryInput,
  Instruction,
  Node,
  NodeCatalogEntry,
} from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export type { ActionPortsScope };

function mapNode(row: typeof schema.nodes.$inferSelect): Node {
  return {
    id: row.id,
    projectId: row.projectId,
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
    archetypeId: row.archetypeId ?? null,
    typicalValueOverrides: row.typicalValueOverrides,
    lifecycleTransitions: row.lifecycleTransitions as Record<
      LifecycleStatus,
      LifecycleStatus[]
    >,
    contentGuide: row.contentGuide,
    propertySchema: (row.propertySchema ?? {}) as NodeCatalogEntry["propertySchema"],
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
    projectId: row.projectId,
    slug: row.slug,
    instructionKey: row.instructionKey,
    title: row.title,
    triggerPatterns: row.triggerPatterns,
    applicableNodeTypes: row.applicableNodeTypes,
    requiredActions: row.requiredActions,
    optionalActions: row.optionalActions,
    lifecycle: row.lifecycle as LifecycleStatus,
    body: row.body,
    contentUrl: row.contentUrl,
    scope: row.scope as InstructionScope,
    triggers: normalizeInstructionTriggerEvents(row.triggers),
    workflowSteps: row.workflowSteps as InstructionWorkflowStep[],
    allowedActions: row.allowedActions,
    outputContract: row.outputContract,
    gatePolicy: row.gatePolicy,
    completionCriteria: row.completionCriteria,
  };
}

export function createCatalogPort(db: Db, scope: ActionPortsScope): CatalogPort {
  const { projectId } = scope;

  return {
    async getNodeCatalogEntry(nodeType) {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.projectId, projectId),
            eq(schema.nodeCatalog.nodeType, nodeType),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapNodeCatalogEntry(row);
    },

    async getNodeCatalogEntryBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(
          and(
            eq(schema.nodeCatalog.projectId, projectId),
            eq(schema.nodeCatalog.slug, slug),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapNodeCatalogEntry(row);
    },

    async listNodeCatalogEntries() {
      const rows = await db
        .select()
        .from(schema.nodeCatalog)
        .where(eq(schema.nodeCatalog.projectId, projectId));
      return rows.map(mapNodeCatalogEntry);
    },

    async getEdgeCatalogEntry(edgeType) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.projectId, projectId),
            eq(schema.edgeCatalog.edgeType, edgeType),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapEdgeCatalogEntry(row);
    },

    async getEdgeCatalogEntryBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(
          and(
            eq(schema.edgeCatalog.projectId, projectId),
            eq(schema.edgeCatalog.slug, slug),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapEdgeCatalogEntry(row);
    },

    async listEdgeCatalogEntries() {
      const rows = await db
        .select()
        .from(schema.edgeCatalog)
        .where(eq(schema.edgeCatalog.projectId, projectId));
      return rows.map(mapEdgeCatalogEntry);
    },

    async getActionCatalogEntry(actionType) {
      const rows = await db
        .select()
        .from(schema.actionCatalog)
        .where(
          and(
            eq(schema.actionCatalog.projectId, projectId),
            eq(schema.actionCatalog.actionType, actionType),
          ),
        )
        .limit(1);
      const row = rows[0];
      return mergeActionCatalogEntry(
        row ? mapActionCatalogEntry(row) : null,
        actionType,
      );
    },

    async getActionCatalogEntryBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.actionCatalog)
        .where(
          and(
            eq(schema.actionCatalog.projectId, projectId),
            eq(schema.actionCatalog.slug, slug),
          ),
        )
        .limit(1);
      const row = rows[0];
      return mergeActionCatalogEntryBySlug(
        row ? mapActionCatalogEntry(row) : null,
        slug,
      );
    },

    async listActionCatalogEntries() {
      const rows = await db
        .select()
        .from(schema.actionCatalog)
        .where(eq(schema.actionCatalog.projectId, projectId));
      return mergeActionCatalogEntries(rows.map(mapActionCatalogEntry));
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
            eq(schema.actionPropertyPermissions.projectId, projectId),
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
            eq(schema.instructions.projectId, projectId),
            or(
              sql`lower(${schema.instructions.title}) like ${pattern}`,
              sql`lower(${schema.instructions.body}) like ${pattern}`,
              sql`lower(${schema.instructions.instructionKey}) like ${pattern}`,
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
        .where(eq(schema.instructions.projectId, projectId))
        .limit(input?.limit ?? 100);
      return rows.map(mapInstruction);
    },

    async getInstruction(instructionId) {
      const rows = await db
        .select()
        .from(schema.instructions)
        .where(
          and(
            eq(schema.instructions.projectId, projectId),
            eq(schema.instructions.id, instructionId),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapInstruction(row);
    },

    async getInstructionBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.instructions)
        .where(
          and(
            eq(schema.instructions.projectId, projectId),
            eq(schema.instructions.slug, slug),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapInstruction(row);
    },

    async getInstructionByKey(instructionKey) {
      const rows = await db
        .select()
        .from(schema.instructions)
        .where(
          and(
            eq(schema.instructions.projectId, projectId),
            eq(schema.instructions.instructionKey, instructionKey),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapInstruction(row);
    },
  };
}

export function createGraphReadPort(db: Db, scope: ActionPortsScope): GraphReadPort {
  const { projectId } = scope;

  return {
    async getNode(nodeId) {
      const rows = await db
        .select()
        .from(schema.nodes)
        .where(
          and(eq(schema.nodes.id, nodeId), eq(schema.nodes.projectId, projectId)),
        )
        .limit(1);
      const row = rows[0];
      return row ? mapNode(row) : null;
    },

    async queryNodes(params) {
      let query = db
        .select()
        .from(schema.nodes)
        .where(eq(schema.nodes.projectId, projectId))
        .$dynamic();
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
        query = query.where(and(eq(schema.nodes.projectId, projectId), ...conditions));
      }
      const rows = await query
        .limit(params.limit ?? 20)
        .offset(params.offset ?? 0);
      return rows.map(mapNode);
    },

    async traverseEdges(params) {
      const conditions = [eq(schema.edges.projectId, projectId)];
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
                  ...conditions,
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
                  ...conditions,
                ),
              )
          : Promise.resolve([]);

      const [outRows, inRows] = await Promise.all([outgoing, incoming]);
      const all = [...outRows, ...inRows];

      return all.map(
        (row) =>
          ({
            id: row.id,
            projectId: row.projectId,
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
        .where(
          and(
            eq(schema.edgeCatalog.projectId, projectId),
            eq(schema.edgeCatalog.edgeType, edgeType),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapEdgeCatalogEntry(row);
    },
  };
}

export { createConsolePort } from "./console.js";
export { createOnboardingPort } from "./onboarding.js";

export function createGatePort(db: Db, scope: ActionPortsScope): GatePort {
  const { projectId } = scope;

  return {
    async listPendingGates() {
      const rows = await db
        .select()
        .from(schema.gates)
        .where(
          and(
            eq(schema.gates.projectId, projectId),
            eq(schema.gates.status, "pending"),
          ),
        );
      return rows.map(mapGate);
    },

    async queryGates(params) {
      let query = db
        .select()
        .from(schema.gates)
        .where(eq(schema.gates.projectId, projectId))
        .$dynamic();
      if (params.status) {
        query = query.where(
          and(
            eq(schema.gates.projectId, projectId),
            eq(schema.gates.status, params.status),
          ),
        );
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
        .where(
          and(eq(schema.gates.id, gateId), eq(schema.gates.projectId, projectId)),
        )
        .limit(1);
      const row = rows[0];
      return row ? mapGate(row) : null;
    },

    async createGate(g) {
      const rows = await db
        .insert(schema.gates)
        .values({
          projectId,
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
    projectId: row.projectId,
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

async function applyEffect(
  tx: Db,
  effect: Effect,
  projectId: string,
): Promise<void> {
  if (effect.kind === "create_node") {
    await tx.insert(schema.nodes).values({
      projectId,
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
        .where(
          and(
            eq(schema.nodes.id, effect.nodeId),
            eq(schema.nodes.projectId, projectId),
          ),
        )
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
      .where(
        and(
          eq(schema.nodes.id, effect.nodeId),
          eq(schema.nodes.projectId, projectId),
        ),
      );
  } else if (effect.kind === "create_edge") {
    await tx.insert(schema.edges).values({
      projectId,
      edgeType: effect.edge.edgeType,
      sourceNodeId: effect.edge.sourceNodeId,
      targetNodeId: effect.edge.targetNodeId,
      properties: effect.edge.properties,
    });
  } else if (effect.kind === "delete_node") {
    await tx
      .delete(schema.impactQueue)
      .where(
        and(
          eq(schema.impactQueue.projectId, projectId),
          or(
            eq(schema.impactQueue.sourceNodeId, effect.nodeId),
            eq(schema.impactQueue.targetNodeId, effect.nodeId),
          ),
        ),
      );
    await tx
      .delete(schema.edges)
      .where(
        and(
          eq(schema.edges.projectId, projectId),
          or(
            eq(schema.edges.sourceNodeId, effect.nodeId),
            eq(schema.edges.targetNodeId, effect.nodeId),
          ),
        ),
      );
    await tx
      .delete(schema.nodes)
      .where(
        and(
          eq(schema.nodes.id, effect.nodeId),
          eq(schema.nodes.projectId, projectId),
        ),
      );
  } else if (effect.kind === "update_gate") {
    await tx
      .update(schema.gates)
      .set({
        status: effect.status,
        decisionNote: effect.decisionNote ?? null,
      })
      .where(
        and(
          eq(schema.gates.id, effect.gateId),
          eq(schema.gates.projectId, projectId),
        ),
      );

    if (effect.status === "approved") {
      const gateRows = await tx
        .select()
        .from(schema.gates)
        .where(
          and(
            eq(schema.gates.id, effect.gateId),
            eq(schema.gates.projectId, projectId),
          ),
        )
        .limit(1);
      const gate = gateRows[0];
      if (gate) {
        for (const proposed of gate.proposedEffects as Effect[]) {
          await applyEffect(tx, proposed, projectId);
        }
      }
    }
  } else if (effect.kind === "upsert_node_catalog_entry") {
    const slug = toCatalogSlug(effect.entry.nodeType);
    const label = toCatalogLabel(effect.entry.nodeType);
    await tx
      .insert(schema.nodeCatalog)
      .values({
        projectId,
        nodeType: effect.entry.nodeType,
        slug,
        label,
        family: effect.entry.family,
        archetypeId: effect.entry.archetypeId ?? null,
        typicalValueOverrides: effect.entry.typicalValueOverrides,
        lifecycleTransitions: effect.entry.lifecycleTransitions,
        contentGuide: effect.entry.contentGuide ?? null,
        propertySchema: effect.entry.propertySchema ?? {},
        allowedActionRefs: effect.entry.allowedActionRefs ?? [],
      })
      .onConflictDoUpdate({
        target: [schema.nodeCatalog.projectId, schema.nodeCatalog.nodeType],
        set: {
          family: effect.entry.family,
          archetypeId: effect.entry.archetypeId ?? null,
          typicalValueOverrides: effect.entry.typicalValueOverrides,
          lifecycleTransitions: effect.entry.lifecycleTransitions,
          contentGuide: effect.entry.contentGuide ?? null,
          propertySchema: effect.entry.propertySchema ?? {},
          allowedActionRefs: effect.entry.allowedActionRefs ?? [],
        },
      });
  } else if (effect.kind === "deprecate_node_catalog_entry") {
    await tx
      .delete(schema.nodeCatalog)
      .where(
        and(
          eq(schema.nodeCatalog.projectId, projectId),
          eq(schema.nodeCatalog.nodeType, effect.nodeType),
        ),
      );
  } else if (effect.kind === "deprecate_edge_catalog_entry") {
    await tx
      .delete(schema.edgeCatalog)
      .where(
        and(
          eq(schema.edgeCatalog.projectId, projectId),
          eq(schema.edgeCatalog.edgeType, effect.edgeType),
        ),
      );
  } else if (effect.kind === "deprecate_action_catalog_entry") {
    await tx
      .delete(schema.actionCatalog)
      .where(
        and(
          eq(schema.actionCatalog.projectId, projectId),
          eq(schema.actionCatalog.actionType, effect.actionType),
        ),
      );
  } else if (effect.kind === "deprecate_instruction_catalog_entry") {
    await tx
      .delete(schema.instructions)
      .where(
        and(
          eq(schema.instructions.projectId, projectId),
          eq(schema.instructions.id, effect.instructionId),
        ),
      );
  } else if (effect.kind === "upsert_edge_catalog_entry") {
    const slug = toCatalogSlug(effect.entry.edgeType);
    const label = toCatalogLabel(effect.entry.edgeType);
    await tx
      .insert(schema.edgeCatalog)
      .values({
        projectId,
        edgeType: effect.entry.edgeType,
        slug,
        label,
        domain: effect.entry.domain,
        range: effect.entry.range,
        cardinality: effect.entry.cardinality,
        representation: effect.entry.representation,
      })
      .onConflictDoUpdate({
        target: [schema.edgeCatalog.projectId, schema.edgeCatalog.edgeType],
        set: {
          domain: effect.entry.domain,
          range: effect.entry.range,
          cardinality: effect.entry.cardinality,
          representation: effect.entry.representation,
        },
      });
  } else if (effect.kind === "upsert_property_permission_entry") {
    const existing = await tx
      .select()
      .from(schema.actionPropertyPermissions)
      .where(
        and(
          eq(schema.actionPropertyPermissions.projectId, projectId),
          eq(
            schema.actionPropertyPermissions.actionType,
            effect.permission.actionType,
          ),
          eq(schema.actionPropertyPermissions.nodeType, effect.permission.nodeType),
          eq(
            schema.actionPropertyPermissions.propertyKey,
            effect.permission.propertyKey,
          ),
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
        projectId,
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
        projectId,
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
        target: [schema.actionCatalog.projectId, schema.actionCatalog.actionType],
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
          instructionKey: effect.entry.instructionKey ?? null,
          triggerPatterns: effect.entry.triggerPatterns,
          applicableNodeTypes: effect.entry.applicableNodeTypes,
          requiredActions: effect.entry.requiredActions,
          optionalActions: effect.entry.optionalActions,
          lifecycle: effect.entry.lifecycle,
          body: effect.entry.body ?? null,
          contentUrl: effect.entry.contentUrl ?? null,
          scope: effect.entry.scope,
          triggers: effect.entry.triggers,
          workflowSteps: effect.entry.workflowSteps,
          allowedActions: effect.entry.allowedActions,
          outputContract: effect.entry.outputContract,
          gatePolicy: effect.entry.gatePolicy,
          completionCriteria: effect.entry.completionCriteria ?? null,
        })
        .where(
          and(
            eq(schema.instructions.projectId, projectId),
            eq(schema.instructions.id, effect.entry.instructionId),
          ),
        );
    } else {
      const slug = toCatalogSlug(effect.entry.title);
      await tx.insert(schema.instructions).values({
        projectId,
        slug,
        instructionKey: effect.entry.instructionKey ?? null,
        title: effect.entry.title,
        triggerPatterns: effect.entry.triggerPatterns,
        applicableNodeTypes: effect.entry.applicableNodeTypes,
        requiredActions: effect.entry.requiredActions,
        optionalActions: effect.entry.optionalActions,
        lifecycle: effect.entry.lifecycle,
        body: effect.entry.body ?? null,
        contentUrl: effect.entry.contentUrl ?? null,
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

export function createActionCommitPort(
  db: Db,
  scope: ActionPortsScope,
): ActionCommitPort {
  const { projectId } = scope;

  return {
    async commit(params: CommitParams): Promise<CommitResult> {
      return db.transaction(async (tx) => {
        if (params.gateDecision) {
          await applyEffect(
            tx as unknown as Db,
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
          await applyEffect(tx as unknown as Db, effect, projectId);
        }

        const logRows = await tx
          .insert(schema.actionLog)
          .values({
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
          })
          .returning();

        return {
          logId: logRows[0]!.id,
          appliedEffects: params.effects,
        };
      });
    },

    async getActionLog(params) {
      let query = db
        .select()
        .from(schema.actionLog)
        .where(eq(schema.actionLog.projectId, projectId))
        .$dynamic();
      if (params.actionType) {
        query = query.where(
          and(
            eq(schema.actionLog.projectId, projectId),
            eq(schema.actionLog.actionType, params.actionType),
          ),
        );
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
        .where(
          and(
            eq(schema.actionLog.id, logId),
            eq(schema.actionLog.projectId, projectId),
          ),
        )
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
            eq(schema.actionLog.projectId, projectId),
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
    projectId: row.projectId,
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

function mapImpactQueueItem(
  row: typeof schema.impactQueue.$inferSelect,
): ImpactQueueItem {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceActionLogId: row.sourceActionLogId,
    sourceNodeId: row.sourceNodeId,
    targetNodeId: row.targetNodeId,
    dependencyEdgeId: row.dependencyEdgeId,
    workflowKey: row.workflowKey,
    instructionId: row.instructionId,
    status: row.status,
    priority: row.priority,
    runAt: row.runAt,
    lockedBy: row.lockedBy,
    lockedUntil: row.lockedUntil,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    idempotencyKey: row.idempotencyKey,
    lastError: row.lastError,
    payload: row.payload,
    result: row.result,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export function createImpactQueuePort(
  db: Db,
  scope: ActionPortsScope,
): ImpactQueuePort {
  const { projectId } = scope;

  async function getByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ImpactQueueItem | null> {
    const rows = await db
      .select()
      .from(schema.impactQueue)
      .where(
        and(
          eq(schema.impactQueue.projectId, projectId),
          eq(schema.impactQueue.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapImpactQueueItem(rows[0]) : null;
  }

  return {
    async enqueueImpact(input: ImpactQueueCreateInput) {
      const rows = await db
        .insert(schema.impactQueue)
        .values({
          projectId,
          sourceActionLogId: input.sourceActionLogId,
          sourceNodeId: input.sourceNodeId ?? null,
          targetNodeId: input.targetNodeId ?? null,
          dependencyEdgeId: input.dependencyEdgeId ?? null,
          workflowKey: input.workflowKey,
          instructionId: input.instructionId ?? null,
          priority: input.priority ?? 0,
          runAt: input.runAt ?? new Date(),
          maxAttempts: input.maxAttempts ?? 5,
          idempotencyKey: input.idempotencyKey,
          payload: input.payload ?? {},
        })
        .onConflictDoNothing({
          target: [
            schema.impactQueue.projectId,
            schema.impactQueue.idempotencyKey,
          ],
        })
        .returning();
      const inserted = rows[0];
      if (inserted) return mapImpactQueueItem(inserted);

      const existing = await getByIdempotencyKey(input.idempotencyKey);
      if (!existing) {
        throw new Error("impact_queue enqueue conflict did not return existing row");
      }
      return existing;
    },

    async claimImpactQueue(input: ImpactQueueClaimInput) {
      const currentTime = input.now ?? new Date();
      const lockMs = input.lockMs ?? 5 * 60 * 1000;
      const lockUntil = new Date(currentTime.getTime() + lockMs);
      const limit = input.limit ?? 1;

      return db.transaction(async (tx) => {
        const picked = await tx
          .select({ id: schema.impactQueue.id })
          .from(schema.impactQueue)
          .where(
            and(
              eq(schema.impactQueue.projectId, projectId),
              lte(schema.impactQueue.runAt, currentTime),
              or(
                eq(schema.impactQueue.status, "pending"),
                eq(schema.impactQueue.status, "failed"),
                and(
                  eq(schema.impactQueue.status, "running"),
                  lte(schema.impactQueue.lockedUntil, currentTime),
                ),
              ),
            ),
          )
          .orderBy(
            desc(schema.impactQueue.priority),
            asc(schema.impactQueue.runAt),
            asc(schema.impactQueue.createdAt),
          )
          .limit(limit)
          .for("update", { skipLocked: true });

        const ids = picked.map((row) => row.id);
        if (ids.length === 0) return [];

        const rows = await tx
          .update(schema.impactQueue)
          .set({
            status: "running",
            lockedBy: input.workerId,
            lockedUntil: lockUntil,
            attemptCount: sql`${schema.impactQueue.attemptCount} + 1`,
            updatedAt: currentTime,
          })
          .where(
            and(
              eq(schema.impactQueue.projectId, projectId),
              inArray(schema.impactQueue.id, ids),
            ),
          )
          .returning();

        const rowById = new Map(rows.map((row) => [row.id, row]));
        return ids
          .map((id) => rowById.get(id))
          .filter((row): row is NonNullable<typeof row> => row !== undefined)
          .map(mapImpactQueueItem);
      });
    },

    async completeImpactQueue(queueId, result = {}) {
      const currentTime = new Date();
      const rows = await db
        .update(schema.impactQueue)
        .set({
          status: "succeeded",
          lockedBy: null,
          lockedUntil: null,
          result,
          updatedAt: currentTime,
          completedAt: currentTime,
        })
        .where(
          and(
            eq(schema.impactQueue.projectId, projectId),
            eq(schema.impactQueue.id, queueId),
          ),
        )
        .returning();
      return rows[0] ? mapImpactQueueItem(rows[0]) : null;
    },

    async failImpactQueue(queueId, error, retryAt) {
      const currentTime = new Date();
      const existingRows = await db
        .select()
        .from(schema.impactQueue)
        .where(
          and(
            eq(schema.impactQueue.projectId, projectId),
            eq(schema.impactQueue.id, queueId),
          ),
        )
        .limit(1);
      const existing = existingRows[0];
      if (!existing) return null;

      const willRetry = existing.attemptCount < existing.maxAttempts;
      const rows = await db
        .update(schema.impactQueue)
        .set({
          status: willRetry ? "failed" : "dead",
          lockedBy: null,
          lockedUntil: null,
          runAt: willRetry ? (retryAt ?? currentTime) : existing.runAt,
          lastError: error,
          updatedAt: currentTime,
          completedAt: willRetry ? null : currentTime,
        })
        .where(
          and(
            eq(schema.impactQueue.projectId, projectId),
            eq(schema.impactQueue.id, queueId),
          ),
        )
        .returning();
      return rows[0] ? mapImpactQueueItem(rows[0]) : null;
    },

    async skipImpactQueue(queueId, result = {}) {
      const currentTime = new Date();
      const rows = await db
        .update(schema.impactQueue)
        .set({
          status: "skipped",
          lockedBy: null,
          lockedUntil: null,
          result,
          updatedAt: currentTime,
          completedAt: currentTime,
        })
        .where(
          and(
            eq(schema.impactQueue.projectId, projectId),
            eq(schema.impactQueue.id, queueId),
          ),
        )
        .returning();
      return rows[0] ? mapImpactQueueItem(rows[0]) : null;
    },

    async queryImpactQueue(params?: ImpactQueueQueryInput) {
      let query = db
        .select()
        .from(schema.impactQueue)
        .where(eq(schema.impactQueue.projectId, projectId))
        .$dynamic();
      if (params?.status) {
        query = query.where(
          and(
            eq(schema.impactQueue.projectId, projectId),
            eq(schema.impactQueue.status, params.status),
          ),
        );
      }
      if (params?.workflowKey) {
        query = query.where(
          and(
            eq(schema.impactQueue.projectId, projectId),
            eq(schema.impactQueue.workflowKey, params.workflowKey),
          ),
        );
      }
      const rows = await query
        .orderBy(sql`${schema.impactQueue.createdAt} desc`)
        .limit(params?.limit ?? 20)
        .offset(params?.offset ?? 0);
      return rows.map(mapImpactQueueItem);
    },

    async getImpactQueueItem(queueId) {
      const rows = await db
        .select()
        .from(schema.impactQueue)
        .where(
          and(
            eq(schema.impactQueue.projectId, projectId),
            eq(schema.impactQueue.id, queueId),
          ),
        )
        .limit(1);
      return rows[0] ? mapImpactQueueItem(rows[0]) : null;
    },
  };
}

export function createActionPorts(db: Db, scope: ActionPortsScope): ActionPorts {
  return {
    catalog: createCatalogPort(db, scope),
    graph: createGraphReadPort(db, scope),
    gate: createGatePort(db, scope),
    commit: createActionCommitPort(db, scope),
    impactQueue: createImpactQueuePort(db, scope),
  };
}
