import { DesignToolchainEditor } from "@/components/console/design-toolchain/design-toolchain-editor";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import {
  buildDesignToolchainPropertiesForSave,
  resolveProjectToolchain,
} from "@/lib/design-studio/resolve-project-toolchain";
import { readLifecycleStatus } from "@ssota/core";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";

export default async function DesignToolchainPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx: ProjectRouteContext = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const { node, packageJson, lockfile } = await resolveProjectToolchain(
    project.id,
  );
  const revalidatePath = projectPath(ctx, "design", "design-toolchain");

  async function saveDesignToolchain(input: {
    title: string;
    packageJson: import("@ssota/contracts/catalog").DesignToolchainPackageJson;
    lockfile: string;
  }) {
    "use server";
    await updateGraphNodeAction({
      projectId: project.id,
      nodeId: node.id,
      title: input.title,
      properties: buildDesignToolchainPropertiesForSave({
        packageJson: input.packageJson,
        lockfile: input.lockfile,
      }),
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <DesignToolchainEditor
      key={node.id}
      title={node.title || "Design toolchain"}
      status={readLifecycleStatus(node.properties)}
      initialPackageJson={packageJson}
      initialLockfile={lockfile}
      onSave={saveDesignToolchain}
    />
  );
}
