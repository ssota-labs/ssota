import { redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";

export default async function LegacyGatesRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ workflow?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { workflow } = await searchParams;
  const base = projectPath({ orgSlug, projectSlug }, "workflow");
  const query = new URLSearchParams({ tab: "reviews" });
  if (workflow) query.set("workflow", workflow);
  redirect(`${base}?${query.toString()}`);
}
