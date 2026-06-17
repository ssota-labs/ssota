import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function PlanningPrdPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "prd",
    pathSuffix: ["planning", "prd"],
    defaultTitle: "PRD",
    emptyDescription: "Write the product requirements document.",
  });
}
