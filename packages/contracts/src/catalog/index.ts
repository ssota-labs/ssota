import {
  EDGE_CATALOG,
  EDGE_TYPES,
  type EdgeType,
  type EdgeTypeCatalogEntry,
} from "./edge-types.js";
import {
  NODE_CATALOG,
  NODE_TYPES,
  getNodePropertiesSchema,
  parseNodeProperties,
  type NodeType,
  type NodeTypeCatalogEntry,
} from "./node-types.js";

export * from "./db-catalog.js";
export * from "./catalog-search.js";
export * from "./common.js";
export * from "./content-parsers.js";
export * from "./design-theme-schemas.js";
export * from "./design-toolchain-schemas.js";
export * from "./edge-types.js";
export * from "./goal-schemas.js";
export * from "./node-types.js";
export * from "./ui-component-schemas.js";

export function listNodeTypes(): NodeType[] {
  return [...NODE_TYPES];
}

export function listEdgeTypes(): EdgeType[] {
  return [...EDGE_TYPES];
}

export function getNodeTypeEntry(
  nodeType: string,
): NodeTypeCatalogEntry | null {
  if (!(nodeType in NODE_CATALOG)) {
    return null;
  }
  return NODE_CATALOG[nodeType as NodeType];
}

export function getEdgeTypeEntry(
  edgeType: string,
): EdgeTypeCatalogEntry | null {
  if (!(edgeType in EDGE_CATALOG)) {
    return null;
  }
  return EDGE_CATALOG[edgeType as EdgeType];
}

export function isKnownNodeType(nodeType: string): nodeType is NodeType {
  return nodeType in NODE_CATALOG;
}

export function isKnownEdgeType(edgeType: string): edgeType is EdgeType {
  return edgeType in EDGE_CATALOG;
}

export {
  NODE_CATALOG,
  EDGE_CATALOG,
  NODE_TYPES,
  EDGE_TYPES,
  getNodePropertiesSchema,
  parseNodeProperties,
};
