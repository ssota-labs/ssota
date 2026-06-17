import type { StudioNode } from "@ssota/contracts/catalog";

export function collectStudioUtilityClasses(root: StudioNode): string[] {
  const classes = new Set<string>();

  const visit = (node: StudioNode) => {
    if (
      (node.kind === "element" || node.kind === "component") &&
      node.className
    ) {
      for (const token of node.className.split(/\s+/)) {
        const trimmed = token.trim();
        if (trimmed) classes.add(trimmed);
      }
    }

    if (
      node.kind === "element" ||
      node.kind === "fragment" ||
      node.kind === "component"
    ) {
      for (const child of node.children) {
        visit(child);
      }
    }
  };

  visit(root);
  return [...classes];
}

export function hasComponentRefs(root: StudioNode): boolean {
  let found = false;
  const visit = (node: StudioNode) => {
    if (found) return;
    if (node.kind === "component") {
      found = true;
      return;
    }
    if (node.kind === "element" || node.kind === "fragment") {
      for (const child of node.children) {
        visit(child);
      }
    }
  };
  visit(root);
  return found;
}

export function collectStudioUtilityClassesFromBundle(
  root: StudioNode,
  resolved: Record<string, { root: StudioNode } | null> = {},
): string[] {
  const merged = new Set(collectStudioUtilityClasses(root));
  for (const document of Object.values(resolved)) {
    if (!document?.root) continue;
    for (const className of collectStudioUtilityClasses(document.root)) {
      merged.add(className);
    }
  }
  return [...merged];
}
