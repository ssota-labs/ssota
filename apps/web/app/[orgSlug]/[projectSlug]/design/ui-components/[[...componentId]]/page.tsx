import { notFound, redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { queryUiComponents } from "@/lib/graph/loaders/query-ui-components";
import { getPagePort } from "@/lib/ports";

/**
 * Legacy Design Studio URLs redirect into the json-render page
 * (`/p/{pageId}?component={id}`).
 */
export default async function DesignUiComponentsRedirectPage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    componentId?: string[];
  }>;
}) {
  const { orgSlug, projectSlug, componentId: componentIdSegments } = await params;

  if (componentIdSegments && componentIdSegments.length > 1) {
    notFound();
  }

  const componentId = componentIdSegments?.[0];
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const page = await getPagePort(project.id).getPageBySlug("design/ui-components");
  if (!page) notFound();

  let targetComponentId = componentId;
  if (!targetComponentId) {
    const components = await queryUiComponents(project.id);
    if (components.length > 0) {
      targetComponentId =
        components.find((row) => row.slug === "demo-button")?.id ??
        components[0]!.id;
    }
  }

  const base = projectPath(ctx, "p", page.id);
  redirect(
    targetComponentId ? `${base}?component=${targetComponentId}` : base,
  );
}
