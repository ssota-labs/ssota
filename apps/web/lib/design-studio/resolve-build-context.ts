import { createHash } from "node:crypto";
import {
  computeToolchainDigest,
  type DesignToolchainPackageJson,
} from "@ssota/contracts/catalog";
import {
  parseUiComponentFromProperties,
  type UiComponentContentV2,
} from "@ssota/contracts/catalog";
import type { GraphNode } from "@ssota/core";
import type { StudioBuildInput } from "@ssota/studio-build";

export function hashToolchainDigest(input: {
  packageJson: DesignToolchainPackageJson;
  lockfile: string;
}): string {
  return createHash("sha256")
    .update(computeToolchainDigest(input))
    .digest("hex")
    .slice(0, 32);
}

export function resolveBuildContext(input: {
  teamspaceId: string;
  node: GraphNode;
  packageJson: DesignToolchainPackageJson;
  lockfile: string;
  themeCss: string;
  contentV2?: UiComponentContentV2;
}): StudioBuildInput {
  if (input.node.catalogKey !== "ui_component") {
    throw new Error("resolveBuildContext requires ui_component node");
  }

  const content =
    input.contentV2 ??
    parseUiComponentFromProperties(input.node.properties, "source");

  const entry =
    typeof input.node.properties.entry === "string" &&
    input.node.properties.entry.trim()
      ? input.node.properties.entry
      : "Component.tsx";

  const toolchainDigest = hashToolchainDigest({
    packageJson: input.packageJson,
    lockfile: input.lockfile,
  });

  return {
    teamspaceId: input.teamspaceId,
    entry,
    files: content.files,
    packageJson: input.packageJson,
    lockfile: input.lockfile,
    toolchainDigest,
    themeCss: input.themeCss,
    studioRuntimeInject: true,
  };
}
