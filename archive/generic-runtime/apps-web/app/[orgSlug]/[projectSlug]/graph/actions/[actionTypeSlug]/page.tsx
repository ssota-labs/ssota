import { redirect } from "next/navigation";
import { graphPath } from "@/lib/console/paths";

export default async function GraphActionDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; actionTypeSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  redirect(graphPath(ctx, "nodes"));
}
