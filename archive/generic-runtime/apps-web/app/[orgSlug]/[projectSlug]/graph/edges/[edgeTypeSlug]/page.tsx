import { redirect } from "next/navigation";
import { graphPath } from "@/lib/console/paths";

export default async function GraphEdgeTableRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; edgeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  redirect(graphPath({ orgSlug, projectSlug }, "nodes"));
}
