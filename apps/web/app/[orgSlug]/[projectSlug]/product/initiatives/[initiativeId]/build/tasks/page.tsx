import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";

export default function BuildTasksPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeListPage(props, {
    nodeType: "task",
    pathSuffix: ["build", "tasks"],
    defaultTitle: "Task",
    newLabel: "New task",
    emptyTitle: "No build tasks yet",
    emptyDescription: "Add tasks for this initiative build phase.",
  });
}
