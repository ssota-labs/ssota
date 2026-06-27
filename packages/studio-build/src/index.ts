import { buildStudioBundle } from "./build.js";
import { computeBuildHash } from "./hash.js";
import type { StudioBuildArtifacts, StudioBuildInput, StudioBuildResult } from "./types.js";

export function buildArtifactPaths(teamspaceId: string, buildHash: string) {
  const base = `${teamspaceId}/studio-builds/${buildHash}`;
  return {
    jsPath: `${base}/bundle.js`,
    cssPath: `${base}/bundle.css`,
    mapPath: `${base}/bundle.js.map`,
  };
}

export async function buildStudioPreview(input: StudioBuildInput): Promise<{
  buildHash: string;
  artifacts: StudioBuildArtifacts;
  paths: ReturnType<typeof buildArtifactPaths>;
}> {
  const buildHash = computeBuildHash(input);
  const artifacts = await buildStudioBundle(input);
  const paths = buildArtifactPaths(input.teamspaceId, buildHash);
  return { buildHash, artifacts, paths };
}

export type { StudioBuildInput, StudioBuildResult, StudioBuildArtifacts };
export { dependencyMapFromPackageJson } from "./types.js";
export { buildStudioBundle } from "./build.js";
export { computeBuildHash } from "./hash.js";
