import {
  createStudioBuildStorage,
  studioBuildArtifactPaths,
} from "@ssota/adapter-supabase";
import type { StudioBuildInput } from "@ssota/studio-build";
import { runStudioBuild } from "@ssota/studio-sandbox";

export async function runStudioBuildAndCache(input: {
  projectId: string;
  buildContext: StudioBuildInput;
}) {
  const storage = createStudioBuildStorage();
  const build = await runStudioBuild(input.buildContext);
  const paths = studioBuildArtifactPaths(input.projectId, build.buildHash);
  const cacheHit = await storage.exists(input.projectId, build.buildHash);

  if (!cacheHit) {
    const artifacts = [
      {
        path: paths.jsPath,
        body: build.artifacts.js,
        contentType: "text/javascript",
      },
    ];
    if (build.artifacts.css) {
      artifacts.push({
        path: paths.cssPath,
        body: build.artifacts.css,
        contentType: "text/css",
      });
    }
    if (build.artifacts.map) {
      artifacts.push({
        path: paths.mapPath,
        body: build.artifacts.map,
        contentType: "application/json",
      });
    }
    await storage.upload(input.projectId, build.buildHash, artifacts);
  }

  return { build, paths, cacheHit };
}
