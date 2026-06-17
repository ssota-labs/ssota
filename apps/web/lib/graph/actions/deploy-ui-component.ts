"use server";

import {
  uiComponentContentSchemaV2,
  uiComponentDocumentSchema,
  type UiComponentContentV2,
  type UiComponentDocument,
} from "@ssota/contracts/catalog";
import { GraphError } from "@ssota/core";
import { buildStudioPreview } from "@ssota/studio-build";
import {
  createStudioBuildStorage,
  studioBuildArtifactPaths,
} from "@ssota/adapter-supabase";
import { revalidatePath } from "next/cache";
import { withConsolePaths } from "@/lib/console/revalidate";
import {
  collectProjectRefs,
  detectDirectCycle,
  uniqueProjectRefNodeIds,
} from "@/lib/design-studio/composition";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { syncComposedOfEdges } from "@/lib/graph/actions/sync-composed-of-edges";
import { getGraphDeps } from "@/lib/graph/graph-deps";

function revalidateConsole(paths: string[]) {
  for (const path of withConsolePaths(paths)) {
    revalidatePath(path);
  }
}

export async function deployUiComponentAction(input: {
  projectId: string;
  nodeId: string;
  document?: UiComponentDocument;
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

  const representation =
    (existing.properties.representation as "source" | "tree" | undefined) ??
    "tree";

  if (representation === "source") {
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
    return;
  }

  const document = uiComponentDocumentSchema.parse(input.document);
  const refNodeIds = uniqueProjectRefNodeIds(collectProjectRefs(document.root));

  const childContents: Record<string, string | null | undefined> = {};
  for (const refNodeId of refNodeIds) {
    const refNode = await deps.graphRead.getNode({
      projectId: input.projectId,
      nodeId: refNodeId,
    });
    if (!refNode || refNode.nodeType !== "ui_component") {
      throw new GraphError(
        "VALIDATION_FAILED",
        `Referenced component '${refNodeId}' was not found in this project`,
      );
    }
    childContents[refNodeId] = refNode.content;
  }

  const cycleError = detectDirectCycle(
    input.nodeId,
    document,
    childContents,
  );
  if (cycleError) {
    throw new GraphError("VALIDATION_FAILED", cycleError);
  }

  const nextProperties = { ...existing.properties };
  delete nextProperties.draft;

  await updateGraphNodeAction({
    projectId: input.projectId,
    nodeId: input.nodeId,
    content: JSON.stringify(document),
    properties: nextProperties,
    lifecycleStatus: "Active",
    revalidatePaths: input.revalidatePaths,
  });

  await syncComposedOfEdges({
    projectId: input.projectId,
    sourceNodeId: input.nodeId,
    targetNodeIds: refNodeIds,
  });

  revalidateConsole(input.revalidatePaths);
}
