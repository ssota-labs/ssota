import { DesignThemeEditor } from "@/components/console/design-theme/design-theme-editor";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import {
  buildDesignThemePropertiesForSave,
  resolveProjectTheme,
} from "@/lib/design-studio/resolve-project-theme";
import { readLifecycleStatus, readNodeContent } from "@ssota/core";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";

export default async function DesignThemePage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx: ProjectRouteContext = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const { node, tokens } = await resolveProjectTheme(project.id);
  const revalidatePath = projectPath(ctx, "design", "design-theme");

  async function saveDesignTheme(input: {
    title: string;
    tokens: Record<string, string>;
    content: string;
  }) {
    "use server";
    await updateGraphNodeAction({
      projectId: project.id,
      nodeId: node.id,
      title: input.title,
      content: input.content,
      properties: buildDesignThemePropertiesForSave(input.tokens),
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <DesignThemeEditor
      key={node.id}
      title={node.title || "Design theme"}
      status={readLifecycleStatus(node.properties)}
      initialTokens={tokens}
      initialContent={readNodeContent(node.properties) ?? ""}
      onSave={saveDesignTheme}
    />
  );
}
