import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function ArchitectureIntegrationPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "integration_spec",
    pathSuffix: ["architecture", "integration"],
    defaultTitle: "Integration delta",
    emptyDescription: "Document initiative-specific integrations.",
  });
}
