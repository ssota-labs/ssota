import { createInitiativeDocumentPage } from "@/lib/console/initiative-page-factory";

export default function QaTestPlanPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeDocumentPage(props, {
    nodeType: "test_plan",
    pathSuffix: ["qa", "test-plan"],
    defaultTitle: "Test plan",
    emptyDescription: "Document the QA test plan.",
  });
}
