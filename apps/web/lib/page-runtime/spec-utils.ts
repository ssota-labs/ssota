import type { JsonRenderSpec } from "@ssota/contracts";

export function pageUsesDocumentSheetList(spec: JsonRenderSpec): boolean {
  return Object.values(spec.elements).some(
    (element) => element.type === "DocumentSheetList",
  );
}
