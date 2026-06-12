import { redirect } from "next/navigation";
import { graphPath } from "@/lib/console/paths";

export default async function GraphOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  redirect(graphPath({ orgSlug, projectSlug }, "nodes"));
}
