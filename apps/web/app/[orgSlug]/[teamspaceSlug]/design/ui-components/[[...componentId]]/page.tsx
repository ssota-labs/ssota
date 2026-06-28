import { notFound, redirect } from "next/navigation";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
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
    teamspaceSlug: string;
    componentId?: string[];
  }>;
}) {
  const { orgSlug, teamspaceSlug, componentId: componentIdSegments } = await params;

  if (componentIdSegments && componentIdSegments.length > 1) {
    notFound();
  }

  const componentId = componentIdSegments?.[0];
  const ctx = { orgSlug, teamspaceSlug };
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
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

  const base = orgPath(ctx, "p", page.id);
  redirect(
    targetComponentId ? `${base}?component=${targetComponentId}` : base,
  );
}
