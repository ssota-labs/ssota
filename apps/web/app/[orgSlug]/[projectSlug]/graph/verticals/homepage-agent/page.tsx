import { HomepageAgentVerticalView } from "@/components/graph/homepage-agent-vertical";

export default async function HomepageAgentVerticalPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  return <HomepageAgentVerticalView ctx={{ orgSlug, projectSlug }} />;
}
