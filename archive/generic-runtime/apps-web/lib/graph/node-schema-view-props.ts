import type { EdgeCatalogEntry, NodeCatalogEntry } from "@ssota/contracts";
import type {
  SchemaNodeTypeMeta,
  SchemaRelation,
} from "@/components/graph/node-schema-view";

export function buildSchemaRelations(
  nodeType: string,
  edgeCatalog: EdgeCatalogEntry[],
): SchemaRelation[] {
  return edgeCatalog
    .filter(
      (edge) => edge.domain.includes(nodeType) || edge.range.includes(nodeType),
    )
    .map((edge) => ({
      edgeType: edge.edgeType,
      label: edge.label,
      domain: edge.domain,
      range: edge.range,
      cardinality: edge.cardinality,
    }));
}

export function buildNodeTypeCatalog(
  nodeCatalog: NodeCatalogEntry[],
): Record<string, SchemaNodeTypeMeta> {
  return Object.fromEntries(
    nodeCatalog.map((entry) => [
      entry.nodeType,
      {
        label: entry.label,
        family: entry.family,
        archetypeId: entry.archetypeId ?? null,
        contentGuide: entry.contentGuide ?? null,
        propertyCount: Object.keys(entry.propertySchema).length,
      },
    ]),
  );
}
