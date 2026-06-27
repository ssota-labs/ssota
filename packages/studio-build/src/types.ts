import type { DesignToolchainPackageJson } from "@ssota/contracts/catalog";

export type StudioBuildInput = {
  teamspaceId: string;
  entry: string;
  files: Record<string, string>;
  packageJson: DesignToolchainPackageJson;
  lockfile: string;
  toolchainDigest: string;
  themeCss?: string;
  studioRuntimeInject: boolean;
};

export type StudioBuildArtifacts = {
  js: Uint8Array;
  css?: Uint8Array;
  map?: Uint8Array;
};

export type StudioBuildResult = {
  buildHash: string;
  jsPath: string;
  cssPath?: string;
  mapPath?: string;
  cacheHit: boolean;
};

export function dependencyMapFromPackageJson(
  packageJson: DesignToolchainPackageJson,
): Record<string, string> {
  return {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
}
