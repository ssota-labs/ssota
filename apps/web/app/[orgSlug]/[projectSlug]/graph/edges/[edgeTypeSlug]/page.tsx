import { redirect } from "next/navigation";
import { graphPath } from "@/lib/console/paths";

export default async function GraphEdgeTableRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; edgeTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug, edgeTypeSlug } = await params;
  const slug = decodeURIComponent(edgeTypeSlug).toLowerCase();
  redirect(`${graphPath({ orgSlug, projectSlug }, "edges")}?table=${encodeURIComponent(slug)}`);
}
