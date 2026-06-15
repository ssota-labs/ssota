import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";

export default function BuildPullRequestsPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeListPage(props, {
    nodeType: "pull_request",
    pathSuffix: ["build", "pull-requests"],
    defaultTitle: "Pull request",
    newLabel: "New pull request",
    emptyTitle: "No pull requests yet",
    emptyDescription: "Track pull requests for this initiative.",
  });
}
