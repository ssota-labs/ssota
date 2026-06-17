export type StudioBuildInput = {
  projectId: string;
  entry: string;
  files: Record<string, string>;
  dependencies: Record<string, string>;
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
