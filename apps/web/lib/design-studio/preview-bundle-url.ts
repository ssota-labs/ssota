import { createPreviewBundleAccessToken } from "./preview-bundle-access";

const PREVIEW_BUNDLE_FILES = new Set(["bundle.js", "bundle.css", "bundle.js.map"]);

export type PreviewBundleFileName = "bundle.js" | "bundle.css" | "bundle.js.map";

export function isPreviewBundleFile(name: string): boolean {
  return PREVIEW_BUNDLE_FILES.has(name);
}

/** Same-origin URL for iframe preview (avoids cross-origin module load from storage). */
export function studioPreviewBundleUrl(
  projectId: string,
  buildHash: string,
  fileName: PreviewBundleFileName,
): string {
  const access = createPreviewBundleAccessToken({
    projectId,
    buildHash,
    fileName,
  });
  return `/api/studio/bundle/${projectId}/${buildHash}/${fileName}?access=${encodeURIComponent(access)}`;
}

export function contentTypeForPreviewBundleFile(fileName: string): string {
  switch (fileName) {
    case "bundle.js":
      return "text/javascript; charset=utf-8";
    case "bundle.css":
      return "text/css; charset=utf-8";
    case "bundle.js.map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
