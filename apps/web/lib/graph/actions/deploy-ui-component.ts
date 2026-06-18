"use server";

import { uiComponentContentSchemaV2, type UiComponentContentV2 } from "@ssota/contracts/catalog";
import { buildStudioPreview } from "@ssota/studio-build";
import {
  createStudioBuildStorage,
  studioBuildArtifactPaths,
} from "@ssota/adapter-supabase";
import { revalidatePath } from "next/cache";
import { withConsolePaths } from "@/lib/console/revalidate";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { getGraphDeps } from "@/lib/graph/graph-deps";

function revalidateConsole(paths: string[]) {
  for (const path of withConsolePaths(paths)) {
    revalidatePath(path);
  }
}

export async function deployUiComponentAction(input: {
  projectId: string;
  nodeId: string;
  contentV2?: UiComponentContentV2;
  themeCss?: string;
  revalidatePaths: string[];
}) {
  const deps = getGraphDeps(input.projectId);
  const existing = await deps.graphRead.getNode({
    projectId: input.projectId,
    nodeId: input.nodeId,
  });

  if (!existing || existing.nodeType !== "ui_component") {
    throw new Error("UI component not found");
  }

  const content = uiComponentContentSchemaV2.parse(input.contentV2);
  const entry =
    typeof existing.properties.entry === "string"
      ? existing.properties.entry
      : "Component.tsx";
  const dependencies =
    existing.properties.dependencies &&
    typeof existing.properties.dependencies === "object"
      ? (existing.properties.dependencies as Record<string, string>)
      : { "@ssota/ui": "workspace:*" };

  const build = await buildStudioPreview({
    projectId: input.projectId,
    entry,
    files: content.files,
    dependencies,
    themeCss: input.themeCss,
    studioRuntimeInject: true,
  });

  const storage = createStudioBuildStorage();
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

  const nextProperties: Record<string, unknown> = {
    ...existing.properties,
    representation: "source",
    contentSchemaVersion: 2,
    entry,
    fileKeys: Object.keys(content.files),
    dependencies,
    buildHash: build.buildHash,
    previewArtifactPath: paths.jsPath,
    builtAt: new Date().toISOString(),
  };
  delete nextProperties.draft;

  await updateGraphNodeAction({
    projectId: input.projectId,
    nodeId: input.nodeId,
    content: JSON.stringify(content),
    properties: nextProperties,
    lifecycleStatus: "Active",
    revalidatePaths: input.revalidatePaths,
  });

  revalidateConsole(input.revalidatePaths);
}
