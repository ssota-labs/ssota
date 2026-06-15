import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function DesignFlowsPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "user_flow",
    pathSuffix: ["design", "flows"],
    defaultTitle: "User flow",
    emptyDescription: "Document user flows for this initiative.",
  });
}
