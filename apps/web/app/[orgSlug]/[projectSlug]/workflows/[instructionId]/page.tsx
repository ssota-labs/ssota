import { redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";

export default async function LegacyWorkflowDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    instructionId: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug, projectSlug, instructionId } = await params;
  const { tab } = await searchParams;
  const base = projectPath({ orgSlug, projectSlug }, "workflow", instructionId);
  redirect(tab ? `${base}?tab=${encodeURIComponent(tab)}` : base);
}
