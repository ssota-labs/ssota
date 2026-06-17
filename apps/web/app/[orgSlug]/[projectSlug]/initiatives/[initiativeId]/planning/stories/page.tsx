import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";

export default function PlanningStoriesPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeListPage(props, {
    nodeType: "user_story",
    pathSuffix: ["planning", "stories"],
    defaultTitle: "User story",
    newLabel: "New story",
    emptyTitle: "No stories yet",
    emptyDescription: "Add user stories for this initiative.",
  });
}
