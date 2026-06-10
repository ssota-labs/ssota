import type {
  ActionCatalogEntry,
  ActionPropertyPermission,
  Archetype,
  Node,
  NodeCatalogEntry,
} from "./types.js";
import type { Effect, ExecutorType, LifecycleStatus } from "@loopos/contracts";
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

export function enforceGateRules(
  actionEntry: ActionCatalogEntry,
  executorType: ExecutorType,
  effects: Effect[],
  nodeCatalogEntries: Map<string, NodeCatalogEntry>,
  existingNodes: Map<string, Node>,
): { requiresGate: boolean; reason: string } {
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
