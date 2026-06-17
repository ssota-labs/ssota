import type {
  ProjectComponentRef,
  StudioNode,
  UiComponentDocument,
} from "@ssota/contracts/catalog";
import { parseUiComponentDocumentSafe } from "@ssota/contracts/catalog";

export type ResolvedComponentMap = Record<string, UiComponentDocument | null>;

export function resolvePublishedDocument(
  content: string | null | undefined,
): UiComponentDocument | null {
  if (!content) return null;
  return parseUiComponentDocumentSafe(content);
}

export function buildResolvedComponentMap(
  entries: Array<{ nodeId: string; content: string | null }>,
): ResolvedComponentMap {
  return Object.fromEntries(
    entries.map(({ nodeId, content }) => [
      nodeId,
      resolvePublishedDocument(content),
    ]),
  );
}

export function inlineProjectRefs(
  root: StudioNode,
  resolved: ResolvedComponentMap,
  visiting: Set<string> = new Set(),
): StudioNode {
  return walkAndInline(root, resolved, visiting);
}

function walkAndInline(
  node: StudioNode,
  resolved: ResolvedComponentMap,
  visiting: Set<string>,
): StudioNode {
  if (node.kind === "component") {
    const ref = node.ref as ProjectComponentRef;
    if (visiting.has(ref.nodeId)) {
      return {
        kind: "element",
        id: node.id,
        tag: "div",
        className: node.className,
        children: [
          {
            kind: "text",
            id: `${node.id}-cycle`,
            text: `[Circular ref: ${ref.slug}]`,
          },
        ],
      };
    }

    const doc = resolved[ref.nodeId];
    if (!doc) {
      return {
        kind: "element",
        id: node.id,
        tag: "div",
        className: node.className,
        children: [
          {
            kind: "text",
            id: `${node.id}-missing`,
            text: `[Unresolved: ${ref.slug}]`,
          },
        ],
      };
    }

    visiting.add(ref.nodeId);
    const inlinedRoot = walkAndInline(doc.root, resolved, visiting);
    visiting.delete(ref.nodeId);

    if (inlinedRoot.kind === "element") {
      return {
        ...inlinedRoot,
        id: node.id,
        className: [inlinedRoot.className, node.className]
          .filter(Boolean)
          .join(" ")
          .trim() || undefined,
        children: node.children.length
          ? node.children.map((child) => walkAndInline(child, resolved, visiting))
          : inlinedRoot.children,
      };
    }

    return {
      kind: "fragment",
      id: node.id,
      children: [inlinedRoot, ...node.children.map((child) =>
        walkAndInline(child, resolved, visiting),
      )],
    };
  }

  if (node.kind === "element" || node.kind === "fragment") {
    return {
      ...node,
      children: node.children.map((child) =>
        walkAndInline(child, resolved, visiting),
      ),
    };
  }

  return node;
}
