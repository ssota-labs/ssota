/**
 * Maps the L1 data catalog (`NodeCatalogRow[]` + `EdgeCatalogRow[]`) onto an
 * `ErdModel` so the `/graph` console page can render node/edge types as a
 * schema diagram — one "table" card per node type, one relation line per
 * edge type's domain→range pairing — reusing the same ERD building blocks
 * (`erd-model.ts`, `ErdTableNode`, `ErdRelationEdge`) as the ErdDiagram
 * catalog component.
 */

import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts/catalog";
import type { ErdColumn, ErdModel, ErdRelation, ErdTable } from "@/lib/page-runtime/erd-model";
import type { FlowColorToken } from "@/lib/page-runtime/flow-tokens";
import { WORKFLOW_LENS_PHASES } from "@/lib/console/workflow-lens-config";

const OTHER_GROUP_KEY = "other";
const OTHER_GROUP_TITLE = "기타";

/**
 * Node type → group, reusing the home dashboard's "Workflow subgraph" phase
 * taxonomy (`WORKFLOW_LENS_PHASES`) so the schema diagram groups node types
 * the same way the rest of the console already does. Catalog keys the phase
 * config doesn't cover (org-custom types, or seeded types not yet assigned a
 * phase) fall into a catch-all "기타" group rather than being dropped.
 */
const NODE_TYPE_TO_GROUP = new Map<string, { key: string; title: string }>();
for (const phase of WORKFLOW_LENS_PHASES) {
  for (const type of phase.types) {
    if (!NODE_TYPE_TO_GROUP.has(type.nodeType)) {
      NODE_TYPE_TO_GROUP.set(type.nodeType, { key: phase.key, title: phase.title });
    }
  }
}

function groupForNodeType(key: string): { key: string; title: string } {
  return NODE_TYPE_TO_GROUP.get(key) ?? { key: OTHER_GROUP_KEY, title: OTHER_GROUP_TITLE };
}

/** Header accent cycled deterministically across node type cards. */
const TABLE_COLOR_CYCLE: FlowColorToken[] = [
  "blue",
  "purple",
  "green",
  "amber",
  "pink",
  "orange",
  "red",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * A node catalog's `propertySchema` is domain-agnostic `Record<string, unknown>`.
 * Two shapes are recognized as real field definitions — anything else (e.g. the
 * bare `{ type: "object" }` placeholder most catalog rows carry today) yields no
 * columns rather than fabricating them:
 *  - flat `PropertySchemaField` records: `{ [key]: { valueType, required, ... } }`
 *  - JSON-schema style: `{ properties: { [key]: { type } }, required: [key] }`
 */
function propertySchemaColumns(schema: unknown): ErdColumn[] {
  if (!isRecord(schema)) return [];

  if (isRecord(schema.properties)) {
    const required = new Set(
      Array.isArray(schema.required)
        ? schema.required.filter((r): r is string => typeof r === "string")
        : [],
    );
    return Object.entries(schema.properties)
      .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
      .map(([name, field]) => ({
        name,
        type: typeof field.type === "string" ? field.type : undefined,
        notNull: required.has(name),
      }));
  }

  const flatFields = Object.entries(schema).filter(
    (entry): entry is [string, Record<string, unknown>] =>
      isRecord(entry[1]) && typeof entry[1].valueType === "string",
  );
  return flatFields.map(([name, field]) => ({
    name,
    type: field.valueType as string,
    notNull: field.required === true,
  }));
}

export type GraphSchemaGroup = {
  key: string;
  title: string;
  tableIds: string[];
};

export type GraphSchemaModel = {
  model: ErdModel;
  /** Node types clustered by workflow phase, in display order; empty groups omitted. */
  groups: GraphSchemaGroup[];
  /** Edge types with no resolvable domain/range pair — not drawable as a line. */
  unlinkedEdgeTypes: EdgeCatalogRow[];
};

export function buildGraphSchemaModel(
  nodeTypes: NodeCatalogRow[],
  edgeTypes: EdgeCatalogRow[],
): GraphSchemaModel {
  const nodeById = new Map(nodeTypes.map((n) => [n.id, n]));

  const tables: ErdTable[] = nodeTypes.map((node, index) => ({
    id: node.id,
    name: node.label,
    note: node.key,
    columns: propertySchemaColumns(node.propertySchema),
    color: TABLE_COLOR_CYCLE[index % TABLE_COLOR_CYCLE.length],
  }));

  const groupOrder = [
    ...WORKFLOW_LENS_PHASES.map((phase) => ({ key: phase.key, title: phase.title })),
    { key: OTHER_GROUP_KEY, title: OTHER_GROUP_TITLE },
  ];
  const groupBuckets = new Map<string, string[]>();
  for (const node of nodeTypes) {
    const group = groupForNodeType(node.key);
    const bucket = groupBuckets.get(group.key) ?? [];
    bucket.push(node.id);
    groupBuckets.set(group.key, bucket);
  }
  const groups: GraphSchemaGroup[] = groupOrder
    .filter((g) => groupBuckets.has(g.key))
    .map((g) => ({ key: g.key, title: g.title, tableIds: groupBuckets.get(g.key)! }));

  const relations: ErdRelation[] = [];
  const unlinkedEdgeTypes: EdgeCatalogRow[] = [];

  for (const edge of edgeTypes) {
    const domainIds = edge.domainCatalogIds.filter((id) => nodeById.has(id));
    const rangeIds = edge.rangeCatalogIds.filter((id) => nodeById.has(id));
    if (domainIds.length === 0 || rangeIds.length === 0) {
      unlinkedEdgeTypes.push(edge);
      continue;
    }
    for (const source of domainIds) {
      for (const target of rangeIds) {
        relations.push({
          id: `${edge.id}-${source}-${target}`,
          source,
          target,
          cardinality: "N:M",
          label: edge.label,
        });
      }
    }
  }

  return { model: { tables, relations }, groups, unlinkedEdgeTypes };
}
