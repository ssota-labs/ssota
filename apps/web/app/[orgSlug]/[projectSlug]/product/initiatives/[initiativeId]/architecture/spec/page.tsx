import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function ArchitectureSpecPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "architecture_spec",
    pathSuffix: ["architecture", "spec"],
    defaultTitle: "Implementation architecture",
    emptyDescription: "Document scoped implementation architecture.",
  });
}
