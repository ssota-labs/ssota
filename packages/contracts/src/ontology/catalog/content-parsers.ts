import { NODE_CATALOG, type NodeType } from "./node-types.js";
import {
  extractUiComponentFiles,
  parseUiComponentContent,
  parseUiComponentFromProperties,
} from "./ui-component-schemas.js";

export function requiresNodeContent(
  nodeType: NodeType,
  _properties: Record<string, unknown>,
): boolean {
  const entry = NODE_CATALOG[nodeType];
  if (!entry?.contentRequired) {
    return false;
  }
  if (nodeType === "ui_component") {
    const files = extractUiComponentFiles(_properties);
    return files !== null && Object.keys(files).length > 0;
  }
  return true;
}

export function parseNodeContent(
  nodeType: NodeType,
  content: string | null,
  _properties: Record<string, unknown> = {},
): unknown {
  switch (nodeType) {
    case "ui_component": {
      if (content) {
        return parseUiComponentContent(content, "source");
      }
      return parseUiComponentFromProperties(_properties, "source");
    }
    default:
      return content;
  }
}
