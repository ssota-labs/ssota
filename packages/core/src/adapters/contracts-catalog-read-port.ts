import {
  getEdgeTypeEntry,
  getNodeTypeEntry,
  listEdgeTypes,
  listNodeTypes,
  parseNodeProperties,
} from "@ssota/contracts";
import type { CatalogReadPort } from "../ports/catalog-read-port.js";

export function createContractsCatalogReadPort(): CatalogReadPort {
  return {
    listNodeTypes: () => listNodeTypes().map((nodeType) => {
      const entry = getNodeTypeEntry(nodeType);
      if (!entry) {
        throw new Error(`Missing catalog entry for node type: ${nodeType}`);
      }
      return entry;
    }),
    getNodeTypeEntry,
    listEdgeTypes: () => listEdgeTypes().map((edgeType) => {
      const entry = getEdgeTypeEntry(edgeType);
      if (!entry) {
        throw new Error(`Missing catalog entry for edge type: ${edgeType}`);
      }
      return entry;
    }),
    getEdgeTypeEntry,
    validateNodeProperties(nodeType, properties) {
      return parseNodeProperties(nodeType, properties);
    },
  };
}
