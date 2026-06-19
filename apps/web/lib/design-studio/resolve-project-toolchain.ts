import {
  buildDesignToolchainPropertiesForSave,
  mergeDesignToolchainLockfile,
  mergeDesignToolchainPackageJson,
  parseNodeProperties,
  type DesignToolchainPackageJson,
} from "@ssota/contracts/catalog";
import type { GraphNode } from "@ssota/core";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";

export type ResolvedProjectToolchain = {
  node: GraphNode;
  packageJson: DesignToolchainPackageJson;
  lockfile: string;
};

function extractUserToolchain(node: GraphNode): {
  packageJson?: DesignToolchainPackageJson;
  lockfile?: string;
} {
  const parsed = parseNodeProperties("design_toolchain", node.properties ?? {});
  return {
    packageJson: parsed.package_json as DesignToolchainPackageJson | undefined,
    lockfile:
      typeof parsed.lockfile === "string" ? parsed.lockfile : undefined,
  };
}

export async function resolveProjectToolchain(
  projectId: string,
): Promise<ResolvedProjectToolchain> {
  const node = await ensureEvergreenSingleton(
    projectId,
    "design_toolchain",
    "Design toolchain",
  );

  const user = extractUserToolchain(node);
  const packageJson = mergeDesignToolchainPackageJson(user.packageJson);
  const lockfile = mergeDesignToolchainLockfile(user.lockfile);

  return { node, packageJson, lockfile };
}

export { buildDesignToolchainPropertiesForSave };
