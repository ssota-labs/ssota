import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function BuildPlanPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "implementation_plan",
    pathSuffix: ["build", "plan"],
    defaultTitle: "Implementation plan",
    emptyDescription: "Document the implementation plan for this initiative.",
  });
}
