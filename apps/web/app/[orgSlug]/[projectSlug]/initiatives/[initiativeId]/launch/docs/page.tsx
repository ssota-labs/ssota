import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";

export default function LaunchDocsPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeListPage(props, {
    nodeType: "release_note",
    pathSuffix: ["launch", "docs"],
    defaultTitle: "Release note",
    newLabel: "New release note",
    emptyTitle: "No launch docs yet",
    emptyDescription: "Add release notes and runbooks for launch.",
  });
}
