import { ScaffoldedPage } from "@/components/console/scaffolded-page";

export default async function InitiativePage({
  params,
}: {
  params: Promise<{ initiativeId: string }>;
}) {
  const { initiativeId } = await params;
  return <ScaffoldedPage path="architecture/spec" initiativeId={initiativeId} />;
}
