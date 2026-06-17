import { PublishedComponentsPanel } from "@/components/console/design-studio/published-components-panel";
import { resolveProject } from "@/lib/console/resolve-project";
import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";
import { queryPublishedUiComponents } from "@/lib/graph/loaders/query-published-ui-components";

export default async function DesignWireframesPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  const { orgSlug, projectSlug } = await props.params;
  const { project } = await resolveProject(orgSlug, projectSlug);
  const published = await queryPublishedUiComponents(project.id);
  const list = await createInitiativeListPage(props, {
    nodeType: "page_wireframe",
    pathSuffix: ["design", "wireframes"],
    defaultTitle: "Wireframe",
    newLabel: "New wireframe",
    emptyTitle: "No wireframes yet",
    emptyDescription: "Add wireframes for this initiative.",
  });

  return (
    <div className="space-y-6">
      <PublishedComponentsPanel components={published} />
      {list}
    </div>
  );
}
