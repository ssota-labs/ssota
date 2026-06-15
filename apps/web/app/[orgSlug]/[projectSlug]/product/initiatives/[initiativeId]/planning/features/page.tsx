import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";

export default function PlanningFeaturesPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeListPage(props, {
    nodeType: "feature",
    pathSuffix: ["planning", "features"],
    defaultTitle: "Feature",
    newLabel: "New feature",
    emptyTitle: "No features yet",
    emptyDescription: "Add features for this initiative.",
  });
}
