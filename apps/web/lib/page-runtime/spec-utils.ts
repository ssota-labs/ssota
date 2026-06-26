import type { JsonRenderSpec } from "@ssota/contracts";

export function pageUsesArtifactWorkbench(spec: JsonRenderSpec): boolean {
  return Object.values(spec.elements).some(
    (element) =>
      element.type === "ArtifactWorkbench" || element.type === "ComponentStudio",
  );
}

/** @deprecated Use {@link pageUsesArtifactWorkbench}. */
export const pageUsesComponentStudio = pageUsesArtifactWorkbench;
