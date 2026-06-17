import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function ArchitectureDataPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "data_spec",
    pathSuffix: ["architecture", "data"],
    defaultTitle: "Data delta",
    emptyDescription: "Document initiative-specific data changes.",
  });
}
