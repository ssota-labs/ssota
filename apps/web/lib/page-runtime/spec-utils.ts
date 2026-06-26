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
