import { ScaffoldedPage } from "@/components/console/scaffolded-page";

export default async function NodeDetailPage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  return <ScaffoldedPage path={`nodes/${nodeId}`} />;
}
