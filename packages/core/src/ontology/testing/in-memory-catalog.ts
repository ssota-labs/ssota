import {
  compilePropertySchemaCached,
  type EdgeCatalogRow,
  type NodeCatalogRow,
} from "@ssota/contracts";
import type { CatalogReadPort } from "../ports/catalog-read-port.js";

/**
 * 행 기반 인메모리 CatalogReadPort — **런타임 정의 타입** 테스트용.
 * contracts 기반 포트(`createContractsCatalogReadPort`)는 출하 타입만 알고
 * domain/range가 비어 있어, `property_schema` 검증과 domain/range 거부를 시험할 수 없다.
 * 이 포트는 DB 포트(`createDbCatalogReadPort`)와 같은 검증 규칙을 행 데이터로 재현한다.
 */
export function createInMemoryCatalogReadPort(input: {
  nodes: NodeCatalogRow[];
  edges: EdgeCatalogRow[];
}): CatalogReadPort {
  const nodes = [...input.nodes];
  const edges = [...input.edges];
  const port: CatalogReadPort = {
    async listNodeCatalog() {
      return nodes;
    },
    async getNodeCatalogById(id) {
      return nodes.find((n) => n.id === id) ?? null;
    },
    async getNodeCatalogByKey(key) {
      return nodes.find((n) => n.key === key) ?? null;
    },
    async listEdgeCatalog() {
      return edges;
    },
    async getEdgeCatalogById(id) {
      return edges.find((e) => e.id === id) ?? null;
    },
    async getEdgeCatalogByKey(key) {
      return edges.find((e) => e.key === key) ?? null;
    },
    async searchCatalog(q) {
      const needle = q.query.toLowerCase();
      const hits = [
        ...nodes
          .filter((n) => n.key.includes(needle) || n.label.toLowerCase().includes(needle))
          .map((n) => ({ kind: "node" as const, key: n.key, label: n.label, snippet: n.description, score: 1 })),
        ...edges
          .filter((e) => e.key.includes(needle) || e.label.toLowerCase().includes(needle))
          .map((e) => ({ kind: "edge" as const, key: e.key, label: e.label, snippet: e.description, score: 1 })),
      ];
      return hits.filter((h) => !q.kind || h.kind === q.kind).slice(0, q.limit);
    },
    async validateNodeProperties(catalogKey, properties) {
      const row = await port.getNodeCatalogByKey(catalogKey);
      if (!row) throw new Error(`UNKNOWN_NODE_TYPE:${catalogKey}`);
      return compilePropertySchemaCached(row.propertySchema)(properties);
    },
    async validateEdgeProperties(catalogKey, properties) {
      const row = await port.getEdgeCatalogByKey(catalogKey);
      if (!row) throw new Error(`UNKNOWN_EDGE_TYPE:${catalogKey}`);
      if (!row.propertySchema) return (properties ?? {}) as Record<string, unknown>;
      return compilePropertySchemaCached(row.propertySchema)(properties);
    },
  };
  return port;
}
