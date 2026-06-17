import type {
  ProjectComponentRef,
  StudioNode,
  UiComponentDocument,
} from "@ssota/contracts/catalog";
import { walkStudioNodes } from "./tree-utils";

export function collectProjectRefs(root: StudioNode): ProjectComponentRef[] {
  const refs: ProjectComponentRef[] = [];
  walkStudioNodes(root, (node) => {
    if (node.kind === "component") {
      refs.push(node.ref);
    }
  });
  return refs;
}

export function uniqueProjectRefNodeIds(refs: ProjectComponentRef[]): string[] {
  return [...new Set(refs.map((ref) => ref.nodeId))];
}

export function diffComposedOfTargets(
  currentTargets: string[],
  nextTargets: string[],
): { toCreate: string[]; toDelete: string[] } {
  const current = new Set(currentTargets);
  const next = new Set(nextTargets);
  return {
    toCreate: nextTargets.filter((id) => !current.has(id)),
    toDelete: currentTargets.filter((id) => !next.has(id)),
  };
}

export function collectRefsFromDocument(
  content: string | null | undefined,
): ProjectComponentRef[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content) as UiComponentDocument;
    if (!parsed?.root) return [];
    return collectProjectRefs(parsed.root);
  } catch {
    return [];
  }
}

export function detectDirectCycle(
  componentId: string,
  document: UiComponentDocument,
  childContents: Record<string, string | null | undefined>,
): string | null {
  const directRefs = uniqueProjectRefNodeIds(collectProjectRefs(document.root));
  if (directRefs.includes(componentId)) {
    return "Component cannot reference itself";
  }

  for (const childId of directRefs) {
    const childRefs = collectRefsFromDocument(childContents[childId]);
    if (childRefs.some((ref) => ref.nodeId === componentId)) {
      return "Circular component reference detected";
    }
  }

  return null;
}
