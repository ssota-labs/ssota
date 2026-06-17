import { PublishedComponentsPanel } from "@/components/console/design-studio/published-components-panel";
import { ScopedListRoute } from "@/components/console/scoped-initiative-routes";
import { resolveProject } from "@/lib/console/resolve-project";
import { queryPublishedUiComponents } from "@/lib/graph/loaders/query-published-ui-components";

export default async function DesignWireframesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  const { orgSlug, projectSlug, initiativeId } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const published = await queryPublishedUiComponents(project.id);

  return (
    <div className="space-y-6">
      <PublishedComponentsPanel components={published} />
      <ScopedListRoute
        projectId={project.id}
        initiativeId={initiativeId}
        ctx={ctx}
        nodeType="page_wireframe"
        pathSuffix={["design", "wireframes"]}
        defaultTitle="Wireframe"
        newLabel="New wireframe"
        emptyTitle="No wireframes yet"
        emptyDescription="Add wireframes for this initiative."
      />
    </div>
  );
}
