import { NODE_CATALOG, type NodeType } from "./node-types.js";
import { parseUiComponentContent } from "./ui-component-schemas.js";

export function requiresNodeContent(
  nodeType: NodeType,
  _properties: Record<string, unknown>,
): boolean {
  const entry = NODE_CATALOG[nodeType];
  if (!entry?.contentRequired) {
    return false;
  }
  if (nodeType === "ui_component") {
    return true;
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
      return parseUiComponentContent(content, "source");
    }
    default:
      return content;
  }
}
