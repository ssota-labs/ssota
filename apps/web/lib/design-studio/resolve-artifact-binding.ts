import type { BindingDef } from "@ssota/contracts";
import { studioPreviewBundleUrl } from "./preview-bundle-url";
import { resolveProjectTheme } from "./resolve-project-theme";

/** Enriched artifact binding handed to the `Widget` catalog element. */
export type ResolvedArtifact =
  | { status: "unbuilt"; nodeId?: string }
  | {
      status: "built";
      nodeId: string;
      buildId: string;
      jsUrl: string;
      cssUrl: string;
      themeCss: string;
    };

function isBuiltMarker(
  value: unknown,
): value is { status: "built"; nodeId: string; buildId: string } {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { status?: unknown }).status === "built" &&
    typeof (value as { buildId?: unknown }).buildId === "string"
  );
}

/**
 * Enrich `artifact`-kind bindings (resolved by core to graph fields only) with
 * server-signed bundle URLs + the project theme CSS. Mutates `bindingData` in
 * place. Signing needs the server secret, so this runs in the page route (RSC),
 * not in core's domain-neutral resolver.
 */
export async function resolveArtifactBindings(
  projectId: string,
  bindings: Record<string, BindingDef>,
  bindingData: Record<string, unknown>,
): Promise<void> {
  const artifactKeys = Object.entries(bindings)
    .filter(([, def]) => def.kind === "artifact")
    .map(([key]) => key);
  if (artifactKeys.length === 0) return;

  const hasBuilt = artifactKeys.some((key) => isBuiltMarker(bindingData[key]));
  const themeCss = hasBuilt ? (await resolveProjectTheme(projectId)).themeCss : "";

  for (const key of artifactKeys) {
    const marker = bindingData[key];
    if (!isBuiltMarker(marker)) continue;
    bindingData[key] = {
      status: "built",
      nodeId: marker.nodeId,
      buildId: marker.buildId,
      jsUrl: studioPreviewBundleUrl(projectId, marker.buildId, "bundle.js"),
      cssUrl: studioPreviewBundleUrl(projectId, marker.buildId, "bundle.css"),
      themeCss,
    } satisfies ResolvedArtifact;
  }
}
