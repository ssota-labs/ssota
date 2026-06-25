import type { JsonRenderSpec } from "@ssota/contracts";

const FILL_HEIGHT_PAGE_COMPONENTS = new Set([
  "DocumentSheetList",
  "ComponentStudio",
]);

export function pageUsesFillHeight(spec: JsonRenderSpec): boolean {
  return Object.values(spec.elements).some((element) =>
    FILL_HEIGHT_PAGE_COMPONENTS.has(element.type),
  );
}

export function pageUsesComponentStudio(spec: JsonRenderSpec): boolean {
  return Object.values(spec.elements).some(
    (element) => element.type === "ComponentStudio",
  );
}

/** @deprecated Use {@link pageUsesFillHeight}. */
export function pageUsesDocumentSheetList(spec: JsonRenderSpec): boolean {
  return pageUsesFillHeight(spec);
}
