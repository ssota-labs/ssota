import { redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";

export default async function LegacyWorkflowsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, projectSlug } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") next.set(key, value);
  }
  const suffix = next.toString();
  redirect(
    `${projectPath({ orgSlug, projectSlug }, "workflow")}${suffix ? `?${suffix}` : ""}`,
  );
}
