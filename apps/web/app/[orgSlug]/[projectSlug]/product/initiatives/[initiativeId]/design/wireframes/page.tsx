import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";

export default function DesignWireframesPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeListPage(props, {
    nodeType: "page_wireframe",
    pathSuffix: ["design", "wireframes"],
    defaultTitle: "Wireframe",
    newLabel: "New wireframe",
    emptyTitle: "No wireframes yet",
    emptyDescription: "Add wireframes for this initiative.",
  });
}
