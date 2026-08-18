import type {
  CatalogSearchHit,
  CatalogSearchInput,
  EdgeCatalogRow,
  NodeCatalogRow,
} from "@ssota/contracts";

export interface CatalogReadPort {
  listNodeCatalog(): Promise<NodeCatalogRow[]>;
  getNodeCatalogById(id: string): Promise<NodeCatalogRow | null>;
  getNodeCatalogByKey(key: string): Promise<NodeCatalogRow | null>;
  listEdgeCatalog(): Promise<EdgeCatalogRow[]>;
  getEdgeCatalogById(id: string): Promise<EdgeCatalogRow | null>;
  getEdgeCatalogByKey(key: string): Promise<EdgeCatalogRow | null>;
  /**
   * Keyword/type search over the catalog (node + edge types). Returns
   * lightweight hits ordered best-first; fetch full detail with
   * getNodeCatalogByKey / getEdgeCatalogByKey. The matching backend
   * (ILIKE → FTS → vector) is an implementation detail.
   */
  searchCatalog(input: CatalogSearchInput): Promise<CatalogSearchHit[]>;
  /**
   * 카탈로그 행의 `property_schema`(닫힌 JSON Schema 서브셋)로 properties를 검증한다.
   * 런타임 정의 타입·출하 타입 구분 없이 **항상 DB 스키마가 기준**이다 [GRAPH-05].
   * 위반 시 throw — 호출자(graph use-case)가 GraphError(VALIDATION_FAILED)로 감싼다.
   * 알 수 없는 catalogKey는 throw (UNKNOWN_*_TYPE) — 무검증 통과 경로는 없다.
   */
  validateNodeProperties(
    catalogKey: string,
    properties: unknown,
  ): Promise<Record<string, unknown>>;
  validateEdgeProperties(
    catalogKey: string,
    properties: unknown,
  ): Promise<Record<string, unknown>>;
}

export type { NodeCatalogRow, EdgeCatalogRow };
