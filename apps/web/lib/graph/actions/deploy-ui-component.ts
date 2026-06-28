"use server";

import {
  buildUiComponentPropertiesForSave,
  uiComponentContentSchemaV2,
  type UiComponentContentV2,
} from "@ssota/contracts/catalog";
import { revalidatePath } from "next/cache";
import { withConsolePaths } from "@/lib/console/revalidate";
import { resolveBuildContext } from "@/lib/design-studio/resolve-build-context";
import { resolveProjectTheme } from "@/lib/design-studio/resolve-project-theme";
import { resolveProjectToolchain } from "@/lib/design-studio/resolve-project-toolchain";
import { runStudioBuildAndCache } from "@/lib/design-studio/run-studio-build";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { getGraphDeps } from "@/lib/graph/graph-deps";

function revalidateConsole(paths: string[]) {
  for (const path of withConsolePaths(paths)) {
    revalidatePath(path);
  }
}

export async function deployUiComponentAction(input: {
  teamspaceId: string;
  nodeId: string;
  contentV2?: UiComponentContentV2;
  revalidatePaths: string[];
}) {
  const deps = getGraphDeps(input.teamspaceId);
  const existing = await deps.graphRead.getNode({
    teamspaceId: input.teamspaceId,
    nodeId: input.nodeId,
  });

  if (!existing || existing.catalogKey !== "ui_component") {
    throw new Error("UI component not found");
  }

  const content = uiComponentContentSchemaV2.parse(input.contentV2);
  const [{ themeCss }, { packageJson, lockfile }] = await Promise.all([
    resolveProjectTheme(input.teamspaceId),
    resolveProjectToolchain(input.teamspaceId),
  ]);

  const buildContext = resolveBuildContext({
    teamspaceId: input.teamspaceId,
    node: existing,
    packageJson,
    lockfile,
    themeCss,
    contentV2: content,
  });

  const { build, paths } = await runStudioBuildAndCache({
    teamspaceId: input.teamspaceId,
    buildContext,
  });

  const slug =
    typeof existing.properties.slug === "string"
      ? existing.properties.slug
      : "component";
  const tier =
    existing.properties.tier === "composite" ? "composite" : "primitive";

  const nextProperties: Record<string, unknown> = {
    ...existing.properties,
    ...buildUiComponentPropertiesForSave({
      slug,
      tier,
      entry: buildContext.entry,
      files: content.files,
      layerIndex: content.layerIndex,
      buildHash: build.buildHash,
      previewArtifactPath: paths.jsPath,
      builtAt: new Date().toISOString(),
    }),
    lifecycleStatus: "Active",
  };
  delete nextProperties.draft;
  delete nextProperties.content;

  await updateGraphNodeAction({
    teamspaceId: input.teamspaceId,
    nodeId: input.nodeId,
    properties: nextProperties,
    revalidatePaths: input.revalidatePaths,
  });

  revalidateConsole(input.revalidatePaths);
}
