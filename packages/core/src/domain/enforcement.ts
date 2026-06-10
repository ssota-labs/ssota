import type {
  ActionCatalogEntry,
  ActionPropertyPermission,
  Archetype,
  Node,
  NodeCatalogEntry,
  PropertyCatalogEntry,
} from "./types.js";
import type {
  Effect,
  ExecutorType,
  LifecycleStatus,
  NodeTypeDefinition,
} from "@loopos/contracts";
import { NodeTypeDefinitionSchema } from "@loopos/contracts";
import { ActionRejectedError } from "./types.js";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

const ALL_LIFECYCLE_STATUSES: LifecycleStatus[] = [
  "Draft",
  "Active",
  "Archived",
  "Deleted",
];

export function validateLifecycleTransitions(
  transitions: Record<string, LifecycleStatus[]>,
): void {
  for (const status of ALL_LIFECYCLE_STATUSES) {
    if (!(status in transitions)) {
      throw new ActionRejectedError(
        "INVALID_LIFECYCLE_TRANSITIONS",
        `Missing lifecycle status key: ${status}`,
      );
    }
    const targets = transitions[status];
    if (!Array.isArray(targets)) {
      throw new ActionRejectedError(
        "INVALID_LIFECYCLE_TRANSITIONS",
        `Lifecycle transitions for '${status}' must be an array`,
      );
    }
    for (const target of targets) {
      if (!ALL_LIFECYCLE_STATUSES.includes(target)) {
        throw new ActionRejectedError(
          "INVALID_LIFECYCLE_TRANSITIONS",
          `Invalid lifecycle target: ${target}`,
        );
      }
    }
  }
}

function parseNodeDefinition(input: Record<string, unknown>): NodeTypeDefinition {
  const parsed = NodeTypeDefinitionSchema.safeParse(input.definition ?? input);
  if (!parsed.success) {
    throw new ActionRejectedError(
      "PRECONDITION_FAILED",
      parsed.error.message,
    );
  }
  return parsed.data;
}

export function enforceCatalog(
  actionType: string,
  actionEntry: ActionCatalogEntry | null,
  nodeTypesInEffects: string[],
  getNodeCatalog: (nodeType: string) => Promise<NodeCatalogEntry | null>,
): Promise<void> {
  if (!actionEntry) {
    throw new ActionRejectedError(
      "CATALOG_NOT_FOUND",
      `Action '${actionType}' is not in the action catalog`,
    );
  }

  return (async () => {
    for (const nodeType of nodeTypesInEffects) {
      const entry = await getNodeCatalog(nodeType);
      if (!entry) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Node type '${nodeType}' is not in the node catalog`,
        );
      }
    }
  })();
}

export function checkPreconditions(
  actionEntry: ActionCatalogEntry,
  input: Record<string, unknown>,
  context: { nodes: Map<string, Node> },
): void {
  const required = actionEntry.preconditions.requiredFields as
    | string[]
    | undefined;
  if (required) {
    for (const field of required) {
      if (getNestedValue(input, field) === undefined) {
        throw new ActionRejectedError(
          "PRECONDITION_FAILED",
          `Missing required field: ${field}`,
        );
      }
    }
  }

  const nodeId = input.nodeId as string | undefined;
  if (actionEntry.preconditions.requiresExistingNode && nodeId) {
    if (!context.nodes.has(nodeId)) {
      throw new ActionRejectedError(
        "PRECONDITION_FAILED",
        `Node '${nodeId}' does not exist`,
      );
    }
  }
}

export function resolveEffects(
  actionEntry: ActionCatalogEntry,
  input: Record<string, unknown>,
): Effect[] {
  const effects: Effect[] = [];

  for (const template of actionEntry.effects) {
    if (template.kind === "create_node") {
      const inputProperties =
        (input.properties as Record<string, unknown> | undefined) ?? {};
      const properties = {
        ...template.node.properties,
        ...inputProperties,
      };
      if (input.title !== undefined) {
        properties.title = input.title;
      }

      effects.push({
        kind: "create_node",
        node: {
          nodeType: (input.nodeType as string) ?? template.node.nodeType,
          lifecycleStatus:
            (input.lifecycleStatus as LifecycleStatus) ??
            template.node.lifecycleStatus,
          properties,
          content:
            (input.content as string | null | undefined) ??
            template.node.content,
          contentUrl:
            (input.contentUrl as string | null | undefined) ??
            template.node.contentUrl,
          provenance:
            (input.provenance as Record<string, unknown>) ??
            template.node.provenance,
        },
      });
    } else if (template.kind === "update_node") {
      const nodeId = input.nodeId as string;
      effects.push({
        kind: "update_node",
        nodeId,
        patch: {
          lifecycleStatus:
            (input.lifecycleStatus as LifecycleStatus | undefined) ??
            template.patch.lifecycleStatus,
          properties:
            (input.properties as Record<string, unknown> | undefined) ??
            template.patch.properties,
          content:
            (input.content as string | null | undefined) ??
            template.patch.content,
          contentUrl:
            (input.contentUrl as string | null | undefined) ??
            template.patch.contentUrl,
        },
      });
    } else if (template.kind === "create_edge") {
      effects.push({
        kind: "create_edge",
        edge: {
          edgeType: (input.edgeType as string) ?? template.edge.edgeType,
          sourceNodeId: input.sourceNodeId as string,
          targetNodeId: input.targetNodeId as string,
          properties:
            (input.properties as Record<string, unknown>) ??
            template.edge.properties,
        },
      });
    } else if (template.kind === "update_gate") {
      effects.push({
        kind: "update_gate",
        gateId: (input.gateId as string) ?? template.gateId,
        status:
          (input.status as "approved" | "rejected" | "pending") ??
          template.status,
        decisionNote:
          (input.decisionNote as string | undefined) ?? template.decisionNote,
      });
    } else if (template.kind === "upsert_node_catalog_entry") {
      const definition = parseNodeDefinition(input);
      effects.push({
        kind: "upsert_node_catalog_entry",
        entry: definition,
      });
    } else if (template.kind === "deprecate_node_catalog_entry") {
      effects.push({
        kind: "deprecate_node_catalog_entry",
        nodeType: input.nodeType as string,
        replacementNodeType: input.replacementNodeType as string | undefined,
      });
    } else if (template.kind === "deprecate_edge_catalog_entry") {
      effects.push({
        kind: "deprecate_edge_catalog_entry",
        edgeType: input.edgeType as string,
      });
    } else if (template.kind === "deprecate_property_catalog_entry") {
      effects.push({
        kind: "deprecate_property_catalog_entry",
        propertyKey: input.propertyKey as string,
      });
    } else if (template.kind === "deprecate_action_catalog_entry") {
      effects.push({
        kind: "deprecate_action_catalog_entry",
        actionType: input.actionType as string,
      });
    } else if (template.kind === "deprecate_instruction_catalog_entry") {
      effects.push({
        kind: "deprecate_instruction_catalog_entry",
        instructionId: input.instructionId as string,
      });
    } else if (template.kind === "upsert_edge_catalog_entry") {
      const definition = input.definition as {
        edgeType: string;
        domain: string[];
        range: string[];
        cardinality: string;
        representation: string;
      };
      effects.push({
        kind: "upsert_edge_catalog_entry",
        entry: definition,
      });
    } else if (template.kind === "upsert_property_catalog_entry") {
      const definition = input.definition as {
        propertyKey: string;
        valueType: string;
        constraints: Record<string, unknown>;
        owningActions: string[];
      };
      effects.push({
        kind: "upsert_property_catalog_entry",
        entry: definition,
      });
    } else if (template.kind === "upsert_property_permission_entry") {
      effects.push({
        kind: "upsert_property_permission_entry",
        permission: input.permission as {
          actionType: string;
          nodeType: string;
          propertyKey: string;
          operation: import("@loopos/contracts").PermissionOperation;
          permissionType: import("@loopos/contracts").PermissionType;
          valueConstraint: Record<string, unknown> | null;
          requiresHumanGate: boolean;
          status: string;
        },
      });
    } else if (template.kind === "upsert_action_catalog_entry") {
      const definition = input.definition as {
        actionType: string;
        preconditions: Record<string, unknown>;
        effects: unknown[];
        executor: ExecutorType;
        allowedLifecycleTransitions: Record<string, LifecycleStatus[]>;
        failureMode: string;
        idempotencyRule: string | null;
        logPayloadSchema: Record<string, unknown>;
      };
      effects.push({
        kind: "upsert_action_catalog_entry",
        entry: {
          ...definition,
          effects: definition.effects as Record<string, unknown>[],
        },
      });
    } else if (template.kind === "upsert_instruction_catalog_entry") {
      const definition = input.definition as {
        instructionId?: string;
        title: string;
        triggerPatterns: string[];
        applicableNodeTypes: string[];
        requiredActions: string[];
        optionalActions: string[];
        lifecycle: LifecycleStatus;
        body: string;
      };
      effects.push({
        kind: "upsert_instruction_catalog_entry",
        entry: definition,
      });
    }
  }

  return effects;
}

export async function enforcePermissions(
  actionType: string,
  effects: Effect[],
  getPermissions: (
    actionType: string,
    nodeType: string,
  ) => Promise<ActionPropertyPermission[]>,
  getNode: (nodeId: string) => Promise<Node | null>,
): Promise<void> {
  for (const effect of effects) {
    if (effect.kind === "create_node") {
      const perms = await getPermissions(actionType, effect.node.nodeType);
      for (const [key] of Object.entries(effect.node.properties)) {
        const perm = perms.find((p) => p.propertyKey === key);
        if (perm?.permissionType === "deny") {
          throw new ActionRejectedError(
            "PERMISSION_DENIED",
            `Cannot write property '${key}' on node type '${effect.node.nodeType}'`,
          );
        }
      }
    } else if (effect.kind === "update_node") {
      const node = await getNode(effect.nodeId);
      if (!node) {
        throw new ActionRejectedError(
          "PRECONDITION_FAILED",
          `Node '${effect.nodeId}' does not exist`,
        );
      }
      const perms = await getPermissions(actionType, node.nodeType);
      if (effect.patch.properties) {
        for (const key of Object.keys(effect.patch.properties)) {
          const perm = perms.find((p) => p.propertyKey === key);
          if (perm?.permissionType === "deny") {
            throw new ActionRejectedError(
              "PERMISSION_DENIED",
              `Cannot write property '${key}' on node type '${node.nodeType}'`,
            );
          }
        }
      }
    }
  }
}

export async function checkArchetypeDeviation(
  effects: Effect[],
  getNodeCatalog: (nodeType: string) => Promise<NodeCatalogEntry | null>,
  getArchetype: (archetypeId: string) => Promise<Archetype | null>,
  getNode: (nodeId: string) => Promise<Node | null>,
): Promise<{ deviates: boolean; reason: string }> {
  for (const effect of effects) {
    let nodeType: string;
    let properties: Record<string, unknown>;

    if (effect.kind === "create_node") {
      nodeType = effect.node.nodeType;
      properties = effect.node.properties;
    } else if (effect.kind === "update_node" && effect.patch.properties) {
      const node = await getNode(effect.nodeId);
      if (!node) continue;
      nodeType = node.nodeType;
      properties = { ...node.properties, ...effect.patch.properties };
    } else {
      continue;
    }

    const catalog = await getNodeCatalog(nodeType);
    if (!catalog) continue;

    const archetype = await getArchetype(catalog.archetypeId);
    if (!archetype) continue;

    const typical = {
      ...archetype.typicalValues,
      ...catalog.typicalValueOverrides,
    };

    for (const [key, typicalValue] of Object.entries(typical)) {
      const actual = properties[key];
      if (actual !== undefined && actual !== typicalValue) {
        return {
          deviates: true,
          reason: `Property '${key}' deviates from archetype typical value`,
        };
      }
    }
  }

  return { deviates: false, reason: "" };
}

export function detectBreakingNodeTypeChange(
  existing: NodeCatalogEntry,
  patch: Record<string, unknown>,
): boolean {
  if (patch.family !== undefined && patch.family !== existing.family) {
    return true;
  }
  if (
    patch.archetypeId !== undefined &&
    patch.archetypeId !== existing.archetypeId
  ) {
    return true;
  }
  if (patch.lifecycleTransitions !== undefined) {
    return (
      JSON.stringify(patch.lifecycleTransitions) !==
      JSON.stringify(existing.lifecycleTransitions)
    );
  }
  return false;
}

const CATALOG_EFFECT_KINDS = new Set([
  "upsert_node_catalog_entry",
  "deprecate_node_catalog_entry",
  "upsert_edge_catalog_entry",
  "deprecate_edge_catalog_entry",
  "upsert_property_catalog_entry",
  "deprecate_property_catalog_entry",
  "upsert_property_permission_entry",
  "upsert_action_catalog_entry",
  "deprecate_action_catalog_entry",
  "upsert_instruction_catalog_entry",
  "deprecate_instruction_catalog_entry",
]);

const PROTECTED_ACTION_TYPES = new Set([
  "approve_gate",
  "define_node_type",
  "update_node_type",
  "deprecate_node_type",
]);

export function enforceActionContractSafety(
  definition: {
    actionType: string;
    executor: ExecutorType;
    effects: Record<string, unknown>[];
  },
): void {
  if (
    PROTECTED_ACTION_TYPES.has(definition.actionType) &&
    definition.executor !== "Human"
  ) {
    throw new ActionRejectedError(
      "UNSAFE_EFFECT",
      `Action '${definition.actionType}' must keep Human executor`,
    );
  }

  for (const effect of definition.effects) {
    const kind = effect.kind as string | undefined;
    if (kind && CATALOG_EFFECT_KINDS.has(kind)) {
      throw new ActionRejectedError(
        "UNSAFE_EFFECT",
        `Action contract cannot declare catalog effect '${kind}'`,
      );
    }
  }
}

export async function enforceCatalogMutationIntegrity(
  actionType: string,
  effects: Effect[],
  catalog: {
    getNodeCatalogEntry: (
      nodeType: string,
    ) => Promise<NodeCatalogEntry | null>;
    getArchetype: (archetypeId: string) => Promise<Archetype | null>;
    getPropertyCatalogEntry: (
      propertyKey: string,
    ) => Promise<PropertyCatalogEntry | null>;
    getActionCatalogEntry: (
      actionType: string,
    ) => Promise<ActionCatalogEntry | null>;
    getEdgeCatalogEntry: (
      edgeType: string,
    ) => Promise<import("./types.js").EdgeCatalogEntry | null>;
    getInstruction?: (instructionId: string) => Promise<import("./types.js").Instruction | null>;
    hasNodesOfType?: (nodeType: string) => Promise<boolean>;
    hasEdgesOfType?: (edgeType: string) => Promise<boolean>;
  },
): Promise<void> {
  for (const effect of effects) {
    if (effect.kind === "upsert_node_catalog_entry") {
      validateLifecycleTransitions(effect.entry.lifecycleTransitions);

      const archetype = await catalog.getArchetype(effect.entry.archetypeId);
      if (!archetype) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Archetype '${effect.entry.archetypeId}' does not exist`,
        );
      }

      const existing = await catalog.getNodeCatalogEntry(effect.entry.nodeType);
      if (actionType === "define_node_type" && existing) {
        throw new ActionRejectedError(
          "DUPLICATE_NODE_TYPE",
          `Node type '${effect.entry.nodeType}' already exists`,
        );
      }
      if (actionType === "update_node_type" && !existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Node type '${effect.entry.nodeType}' does not exist`,
        );
      }

      if (effect.entry.propertyRefs) {
        for (const key of effect.entry.propertyRefs) {
          const prop = await catalog.getPropertyCatalogEntry(key);
          if (!prop) {
            throw new ActionRejectedError(
              "CATALOG_NOT_FOUND",
              `Property '${key}' is not in the property catalog`,
            );
          }
        }
      }

      if (effect.entry.allowedActionRefs) {
        for (const ref of effect.entry.allowedActionRefs) {
          const action = await catalog.getActionCatalogEntry(ref);
          if (!action) {
            throw new ActionRejectedError(
              "CATALOG_NOT_FOUND",
              `Action '${ref}' is not in the action catalog`,
            );
          }
        }
      }
    }

    if (effect.kind === "deprecate_node_catalog_entry") {
      const existing = await catalog.getNodeCatalogEntry(effect.nodeType);
      if (!existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Node type '${effect.nodeType}' does not exist`,
        );
      }
      if (effect.replacementNodeType) {
        const replacement = await catalog.getNodeCatalogEntry(
          effect.replacementNodeType,
        );
        if (!replacement) {
          throw new ActionRejectedError(
            "CATALOG_NOT_FOUND",
            `Replacement node type '${effect.replacementNodeType}' does not exist`,
          );
        }
      }
      if (catalog.hasNodesOfType) {
        const inUse = await catalog.hasNodesOfType(effect.nodeType);
        if (inUse) {
          throw new ActionRejectedError(
            "CATALOG_IN_USE",
            `Node type '${effect.nodeType}' has runtime nodes and cannot be deprecated`,
          );
        }
      }
    }

    if (effect.kind === "deprecate_edge_catalog_entry") {
      const existing = await catalog.getEdgeCatalogEntry(effect.edgeType);
      if (!existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Edge type '${effect.edgeType}' does not exist`,
        );
      }
      if (catalog.hasEdgesOfType) {
        const inUse = await catalog.hasEdgesOfType(effect.edgeType);
        if (inUse) {
          throw new ActionRejectedError(
            "CATALOG_IN_USE",
            `Edge type '${effect.edgeType}' has runtime edges and cannot be deprecated`,
          );
        }
      }
    }

    if (effect.kind === "deprecate_property_catalog_entry") {
      const existing = await catalog.getPropertyCatalogEntry(effect.propertyKey);
      if (!existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Property '${effect.propertyKey}' does not exist`,
        );
      }
    }

    if (effect.kind === "deprecate_action_catalog_entry") {
      if (PROTECTED_ACTION_TYPES.has(effect.actionType)) {
        throw new ActionRejectedError(
          "UNSAFE_EFFECT",
          `Action '${effect.actionType}' is protected and cannot be deprecated`,
        );
      }
      const existing = await catalog.getActionCatalogEntry(effect.actionType);
      if (!existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Action '${effect.actionType}' does not exist`,
        );
      }
    }

    if (effect.kind === "deprecate_instruction_catalog_entry") {
      const existing = await catalog.getInstruction?.(effect.instructionId);
      if (!existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Instruction '${effect.instructionId}' does not exist`,
        );
      }
    }

    if (effect.kind === "upsert_edge_catalog_entry") {
      const existing = await catalog.getEdgeCatalogEntry(effect.entry.edgeType);
      if (actionType === "define_edge_type" && existing) {
        throw new ActionRejectedError(
          "DUPLICATE_EDGE_TYPE",
          `Edge type '${effect.entry.edgeType}' already exists`,
        );
      }
      if (actionType === "update_edge_type" && !existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Edge type '${effect.entry.edgeType}' does not exist`,
        );
      }
    }

    if (effect.kind === "upsert_property_catalog_entry") {
      const existing = await catalog.getPropertyCatalogEntry(
        effect.entry.propertyKey,
      );
      if (actionType === "define_property" && existing) {
        throw new ActionRejectedError(
          "DUPLICATE_PROPERTY",
          `Property '${effect.entry.propertyKey}' already exists`,
        );
      }
      if (actionType === "update_property" && !existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Property '${effect.entry.propertyKey}' does not exist`,
        );
      }
    }

    if (effect.kind === "upsert_property_permission_entry") {
      const nodeEntry = await catalog.getNodeCatalogEntry(
        effect.permission.nodeType,
      );
      if (!nodeEntry) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Node type '${effect.permission.nodeType}' does not exist`,
        );
      }
      const actionEntry = await catalog.getActionCatalogEntry(
        effect.permission.actionType,
      );
      if (!actionEntry) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Action '${effect.permission.actionType}' does not exist`,
        );
      }
    }

    if (effect.kind === "upsert_action_catalog_entry") {
      if (
        actionType === "define_action_contract" ||
        actionType === "update_action_contract"
      ) {
        enforceActionContractSafety(effect.entry);
      }
      const existing = await catalog.getActionCatalogEntry(
        effect.entry.actionType,
      );
      if (actionType === "define_action_contract" && existing) {
        throw new ActionRejectedError(
          "DUPLICATE_ACTION_TYPE",
          `Action '${effect.entry.actionType}' already exists`,
        );
      }
      if (actionType === "update_action_contract" && !existing) {
        throw new ActionRejectedError(
          "CATALOG_NOT_FOUND",
          `Action '${effect.entry.actionType}' does not exist`,
        );
      }
    }

    if (effect.kind === "upsert_instruction_catalog_entry") {
      if (effect.entry.instructionId) {
        const existing = await catalog.getInstruction?.(effect.entry.instructionId);
        if (actionType === "update_instruction" && !existing) {
          throw new ActionRejectedError(
            "CATALOG_NOT_FOUND",
            `Instruction '${effect.entry.instructionId}' does not exist`,
          );
        }
      } else if (actionType === "update_instruction") {
        throw new ActionRejectedError(
          "PRECONDITION_FAILED",
          "update_instruction requires instructionId in merged definition",
        );
      }
    }
  }
}

export function enforceGateRules(
  actionEntry: ActionCatalogEntry,
  executorType: ExecutorType,
  effects: Effect[],
  nodeCatalogEntries: Map<string, NodeCatalogEntry>,
  existingNodes: Map<string, Node>,
): { requiresGate: boolean; reason: string } {
  for (const effect of effects) {
    if (CATALOG_EFFECT_KINDS.has(effect.kind) && executorType === "Agent") {
      return {
        requiresGate: true,
        reason: "Agent catalog mutation requires human approval",
      };
    }
  }

  if (
    actionEntry.executor === "Human" &&
    executorType !== "Human"
  ) {
    for (const effect of effects) {
      if (effect.kind === "update_node") {
        const node = existingNodes.get(effect.nodeId);
        const patch = effect.patch;
        if (
          patch.lifecycleStatus &&
          patch.lifecycleStatus !== "Draft" &&
          node?.lifecycleStatus === "Draft"
        ) {
          return {
            requiresGate: true,
            reason: "Human executor required for lifecycle promotion from Draft",
          };
        }
      }
      if (effect.kind === "create_node" && effect.node.lifecycleStatus !== "Draft") {
        return {
          requiresGate: true,
          reason: "Human executor required for non-Draft node creation",
        };
      }
    }
  }

  for (const effect of effects) {
    if (effect.kind === "update_node" && effect.patch.lifecycleStatus) {
      const node = existingNodes.get(effect.nodeId);
      if (!node) continue;
      const catalog = nodeCatalogEntries.get(node.nodeType);
      if (!catalog) continue;
      const allowed =
        catalog.lifecycleTransitions[node.lifecycleStatus] ?? [];
      if (!allowed.includes(effect.patch.lifecycleStatus)) {
        return {
          requiresGate: true,
          reason: `Lifecycle transition ${node.lifecycleStatus} → ${effect.patch.lifecycleStatus} not in whitelist`,
        };
      }
    }
  }

  return { requiresGate: false, reason: "" };
}

export function enforceEffectsContract(
  actionEntry: ActionCatalogEntry,
  effects: Effect[],
): void {
  const declaredKinds = new Set(actionEntry.effects.map((e) => e.kind));
  for (const effect of effects) {
    if (!declaredKinds.has(effect.kind)) {
      throw new ActionRejectedError(
        "EFFECTS_OUT_OF_CONTRACT",
        `Effect kind '${effect.kind}' is not declared in action contract`,
      );
    }
  }
}
