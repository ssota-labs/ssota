import { ScaffoldedPage } from "@/components/console/scaffolded-page";

export default async function InitiativeHubPage({
  params,
}: {
  params: Promise<{ initiativeId: string }>;
}) {
  const { initiativeId } = await params;
  return <ScaffoldedPage path="" initiativeId={initiativeId} />;
}
