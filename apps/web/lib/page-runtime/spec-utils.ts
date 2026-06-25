import type { JsonRenderSpec } from "@ssota/contracts";

const FILL_HEIGHT_PAGE_COMPONENTS = new Set(["DocumentSheetList"]);

export function pageUsesDocumentSheetList(spec: JsonRenderSpec): boolean {
  return Object.values(spec.elements).some((element) =>
    FILL_HEIGHT_PAGE_COMPONENTS.has(element.type),
  );
}
