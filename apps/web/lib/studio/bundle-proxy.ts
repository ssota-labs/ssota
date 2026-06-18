import { studioBuildArtifactPaths } from "@ssota/adapter-supabase";

const ALLOWED_BUNDLE_FILES = new Set(["bundle.js", "bundle.css"]);

export function studioBundleProxyUrl(
  projectId: string,
  buildHash: string,
  file: "bundle.js" | "bundle.css",
): string {
  return `/api/studio/bundle/${projectId}/${buildHash}/${file}`;
}

export function resolveStudioBundleStoragePath(
  projectId: string,
  buildHash: string,
  filename: string,
): string | null {
  if (!ALLOWED_BUNDLE_FILES.has(filename)) {
    return null;
  }

  const paths = studioBuildArtifactPaths(projectId, buildHash);
  if (filename === "bundle.js") {
    return paths.jsPath;
  }
  return paths.cssPath;
}
