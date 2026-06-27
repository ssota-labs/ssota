const BUNDLE_FILES = {
  js: "bundle.js",
  css: "bundle.css",
} as const;

export type StudioBundleArtifact = keyof typeof BUNDLE_FILES;

/** Same-origin preview URL for studio build artifacts (avoids cross-origin module load). */
export function bundlePreviewAssetUrl(input: {
  teamspaceId: string;
  buildHash: string;
  artifact: StudioBundleArtifact;
}): string {
  const params = new URLSearchParams({
    teamspaceId: input.teamspaceId,
    buildHash: input.buildHash,
    file: BUNDLE_FILES[input.artifact],
  });
  return `/api/studio/bundle?${params.toString()}`;
}
