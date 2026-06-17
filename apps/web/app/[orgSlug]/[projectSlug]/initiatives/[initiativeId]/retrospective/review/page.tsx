import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function RetroReviewPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "retrospective",
    pathSuffix: ["retrospective", "review"],
    defaultTitle: "Retrospective",
    emptyDescription: "Write the initiative retrospective.",
  });
}
