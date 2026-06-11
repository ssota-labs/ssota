import { redirect } from "next/navigation";
import { graphPath } from "@/lib/console/paths";
import { getActionPorts } from "@/lib/ports";

export default async function GraphOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const ports = getActionPorts();
  const nodeTypes = await ports.catalog.listNodeCatalogEntries();

  if (nodeTypes[0]) {
    redirect(graphPath(ctx, "nodes", nodeTypes[0].slug));
  }

  redirect(graphPath(ctx, "nodes"));
}
