import type { JsonRenderSpec } from "@ssota/contracts";

const FILL_HEIGHT_PAGE_COMPONENTS = new Set([
  "DocumentSheetList",
  "ArtifactWorkbench",
  "ComponentStudio",
]);

export function pageUsesFillHeight(spec: JsonRenderSpec): boolean {
  const root = spec.elements[spec.root];
  if (root?.type === "SplitPane") return true;
  return Object.values(spec.elements).some((element) =>
    FILL_HEIGHT_PAGE_COMPONENTS.has(element.type),
  );
}

type PageFillHeightInput = {
  appliesToNodeType?: string | null;
  parentId?: string | null;
  position: number;
  spec: JsonRenderSpec;
};

/** Node landing (`/n/{id}`) home templates that should use full-bleed shell. */
export function fillHeightNodeLandingCatalogKeys(
  pages: PageFillHeightInput[],
): string[] {
  const rootsByType = new Map<string, PageFillHeightInput[]>();
  for (const page of pages) {
    if (!page.appliesToNodeType || page.parentId) continue;
    const list = rootsByType.get(page.appliesToNodeType) ?? [];
    list.push(page);
    rootsByType.set(page.appliesToNodeType, list);
  }

  const keys: string[] = [];
  for (const [catalogKey, roots] of rootsByType) {
    const home = [...roots].sort((a, b) => a.position - b.position)[0];
    if (home && pageUsesFillHeight(home.spec)) {
      keys.push(catalogKey);
    }
  }
  return keys;
}

export function pageUsesArtifactWorkbench(spec: JsonRenderSpec): boolean {
  return Object.values(spec.elements).some(
    (element) =>
      element.type === "ArtifactWorkbench" || element.type === "ComponentStudio",
  );
}

/** @deprecated Use {@link pageUsesArtifactWorkbench}. */
export const pageUsesComponentStudio = pageUsesArtifactWorkbench;

/** @deprecated Use {@link pageUsesFillHeight}. */
export function pageUsesDocumentSheetList(spec: JsonRenderSpec): boolean {
  return pageUsesFillHeight(spec);
}
