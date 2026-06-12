import { redirect } from "next/navigation";
import { graphPath } from "@/lib/console/paths";

export default async function GraphNodeTableRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; nodeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, nodeTypeSlug } = await params;
  const slug = decodeURIComponent(nodeTypeSlug).toLowerCase();
  redirect(`${graphPath({ orgSlug, projectSlug }, "nodes")}?table=${encodeURIComponent(slug)}`);
}
