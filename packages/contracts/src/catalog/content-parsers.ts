import { NODE_CATALOG, type NodeType } from "./node-types.js";
import {
  parseUiComponentContent,
  type UiComponentRepresentation,
} from "./ui-component-schemas.js";

export function requiresNodeContent(
  nodeType: NodeType,
  properties: Record<string, unknown>,
): boolean {
  const entry = NODE_CATALOG[nodeType];
  if (!entry?.contentRequired) {
    return false;
  }
  if (nodeType === "ui_component") {
    const representation =
      (properties.representation as UiComponentRepresentation | undefined) ??
      "tree";
    return representation === "source";
  }
  return true;
}

export function parseNodeContent(
  nodeType: NodeType,
  content: string | null,
  properties: Record<string, unknown> = {},
): unknown {
  switch (nodeType) {
    case "ui_component": {
      const representation =
        (properties.representation as UiComponentRepresentation | undefined) ??
        "tree";
      return parseUiComponentContent(content, representation);
    }
    default:
      return content;
  }
}
