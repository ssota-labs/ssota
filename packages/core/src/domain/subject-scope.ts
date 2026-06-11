import { SUBJECT_ID_PROPERTY_KEY } from "@ssota/contracts";
import type { Effect } from "@ssota/contracts";
import type { Node, NodeCatalogEntry } from "./types.js";
import { ActionRejectedError } from "./types.js";

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

export function nodeTypeRequiresSubject(entry: NodeCatalogEntry): boolean {
  return entry.propertyRefs.includes(SUBJECT_ID_PROPERTY_KEY);
}

export function readSubjectId(
  properties: Record<string, unknown>,
): string | undefined {
  const value = properties[SUBJECT_ID_PROPERTY_KEY];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function effectsAreCatalogOnly(effects: Effect[]): boolean {
  return (
    effects.length > 0 &&
    effects.every((effect) => CATALOG_EFFECT_KINDS.has(effect.kind))
  );
}

export function injectSubjectIntoEffects(
  effects: Effect[],
  subjectId: string,
  catalogEntries: Map<string, NodeCatalogEntry>,
): Effect[] {
  return effects.map((effect) => {
    if (effect.kind !== "create_node") return effect;
    const catalog = catalogEntries.get(effect.node.nodeType);
    if (!catalog || !nodeTypeRequiresSubject(catalog)) return effect;
    if (readSubjectId(effect.node.properties)) return effect;
    return {
      ...effect,
      node: {
        ...effect.node,
        properties: {
          ...effect.node.properties,
          [SUBJECT_ID_PROPERTY_KEY]: subjectId,
        },
      },
    };
  });
}

export async function enforceSubjectScope(
  subjectId: string | undefined,
  effects: Effect[],
  deps: {
    getNode: (nodeId: string) => Promise<Node | null>;
    getNodeCatalogEntry: (nodeType: string) => Promise<NodeCatalogEntry | null>;
  },
): Promise<void> {
  if (effectsAreCatalogOnly(effects)) {
    return;
  }

  if (effectOnlyUpdatesGate(effects)) {
    return;
  }

  for (const effect of effects) {
    if (effect.kind === "create_node") {
      await enforceCreateNodeSubject(subjectId, effect, deps.getNodeCatalogEntry);
      continue;
    }

    if (effect.kind === "update_node") {
      await enforceUpdateNodeSubject(subjectId, effect, deps);
      continue;
    }

    if (effect.kind === "create_edge") {
      await enforceEdgeSubject(subjectId, effect, deps);
    }
  }
}

function effectOnlyUpdatesGate(effects: Effect[]): boolean {
  return (
    effects.length > 0 && effects.every((effect) => effect.kind === "update_gate")
  );
}

async function enforceCreateNodeSubject(
  subjectId: string | undefined,
  effect: Extract<Effect, { kind: "create_node" }>,
  getNodeCatalogEntry: (nodeType: string) => Promise<NodeCatalogEntry | null>,
): Promise<void> {
  const catalog = await getNodeCatalogEntry(effect.node.nodeType);
  if (!catalog || !nodeTypeRequiresSubject(catalog)) {
    return;
  }

  if (!subjectId) {
    throw new ActionRejectedError(
      "SUBJECT_REQUIRED",
      `Node type '${effect.node.nodeType}' requires a subject context`,
    );
  }

  const effectSubject = readSubjectId(effect.node.properties);
  if (effectSubject && effectSubject !== subjectId) {
    throw new ActionRejectedError(
      "SUBJECT_MISMATCH",
      `subject_id '${effectSubject}' does not match request context`,
    );
  }
}

async function enforceUpdateNodeSubject(
  subjectId: string | undefined,
  effect: Extract<Effect, { kind: "update_node" }>,
  deps: {
    getNode: (nodeId: string) => Promise<Node | null>;
    getNodeCatalogEntry: (nodeType: string) => Promise<NodeCatalogEntry | null>;
  },
): Promise<void> {
  const node = await deps.getNode(effect.nodeId);
  if (!node) return;

  const catalog = await deps.getNodeCatalogEntry(node.nodeType);
  const nodeSubject = readSubjectId(node.properties);
  const requiresSubject =
    nodeSubject !== undefined ||
    (catalog !== null && nodeTypeRequiresSubject(catalog));

  if (!requiresSubject) {
    return;
  }

  if (!subjectId) {
    throw new ActionRejectedError(
      "SUBJECT_REQUIRED",
      `Node '${effect.nodeId}' requires a subject context`,
    );
  }

  if (nodeSubject && nodeSubject !== subjectId) {
    throw new ActionRejectedError(
      "SUBJECT_MISMATCH",
      `Node '${effect.nodeId}' belongs to a different subject`,
    );
  }

  if (effect.patch.properties?.[SUBJECT_ID_PROPERTY_KEY] !== undefined) {
    const patchSubject = effect.patch.properties[SUBJECT_ID_PROPERTY_KEY];
    if (patchSubject !== nodeSubject) {
      throw new ActionRejectedError(
        "SUBJECT_IMMUTABLE",
        `Property '${SUBJECT_ID_PROPERTY_KEY}' cannot be changed`,
      );
    }
  }
}

async function enforceEdgeSubject(
  subjectId: string | undefined,
  effect: Extract<Effect, { kind: "create_edge" }>,
  deps: {
    getNode: (nodeId: string) => Promise<Node | null>;
    getNodeCatalogEntry: (nodeType: string) => Promise<NodeCatalogEntry | null>;
  },
): Promise<void> {
  await assertNodeAccessible(subjectId, effect.edge.sourceNodeId, deps);
  await assertNodeAccessible(subjectId, effect.edge.targetNodeId, deps);
}

async function assertNodeAccessible(
  subjectId: string | undefined,
  nodeId: string,
  deps: {
    getNode: (nodeId: string) => Promise<Node | null>;
    getNodeCatalogEntry: (nodeType: string) => Promise<NodeCatalogEntry | null>;
  },
): Promise<void> {
  const node = await deps.getNode(nodeId);
  if (!node) return;

  const nodeSubject = readSubjectId(node.properties);
  if (!nodeSubject) return;

  if (!subjectId) {
    throw new ActionRejectedError(
      "SUBJECT_REQUIRED",
      `Node '${nodeId}' requires a subject context`,
    );
  }

  if (nodeSubject !== subjectId) {
    throw new ActionRejectedError(
      "SUBJECT_MISMATCH",
      `Node '${nodeId}' belongs to a different subject`,
    );
  }
}

export async function assertNodeInSubjectScope(
  subjectId: string,
  node: Node | null,
): Promise<void> {
  if (!node) {
    throw new ActionRejectedError("PRECONDITION_FAILED", "Node not found");
  }

  const nodeSubject = readSubjectId(node.properties);
  if (nodeSubject && nodeSubject !== subjectId) {
    throw new ActionRejectedError(
      "SUBJECT_MISMATCH",
      `Node '${node.id}' belongs to a different subject`,
    );
  }
}
