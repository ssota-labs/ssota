import type { StudioNode } from "@ssota/contracts/catalog";

export function findStudioNode(
  node: StudioNode,
  nodeId: string,
): StudioNode | null {
  if (node.id === nodeId) return node;
  if (
    node.kind === "element" ||
    node.kind === "fragment" ||
    node.kind === "component"
  ) {
    for (const child of node.children) {
      const found = findStudioNode(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

export function updateStudioNode(
  node: StudioNode,
  nodeId: string,
  updater: (current: StudioNode) => StudioNode,
): StudioNode {
  if (node.id === nodeId) {
    return updater(node);
  }
  if (
    node.kind === "element" ||
    node.kind === "fragment" ||
    node.kind === "component"
  ) {
    return {
      ...node,
      children: node.children.map((child) =>
        updateStudioNode(child, nodeId, updater),
      ),
    };
  }
  return node;
}

export function walkStudioNodes(
  node: StudioNode,
  visit: (node: StudioNode, depth: number) => void,
  depth = 0,
): void {
  visit(node, depth);
  if (
    node.kind === "element" ||
    node.kind === "fragment" ||
    node.kind === "component"
  ) {
    for (const child of node.children) {
      walkStudioNodes(child, visit, depth + 1);
    }
  }
}

export function slugifyComponentTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "component";
}
