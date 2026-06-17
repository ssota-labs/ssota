import { createInitiativeListPage } from "@/lib/console/initiative-page-factory";

export default function RetroMetricsPage(props: {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  return createInitiativeListPage(props, {
    nodeType: "metric_snapshot",
    pathSuffix: ["retrospective", "metrics"],
    defaultTitle: "Metric snapshot",
    newLabel: "New metric",
    emptyTitle: "No metrics yet",
    emptyDescription: "Capture metric snapshots for retrospective.",
  });
}
