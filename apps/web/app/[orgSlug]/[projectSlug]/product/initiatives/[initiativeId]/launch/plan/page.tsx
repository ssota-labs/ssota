import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function LaunchPlanPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "launch_plan",
    pathSuffix: ["launch", "plan"],
    defaultTitle: "Launch plan",
    emptyDescription: "Document the launch plan.",
  });
}
