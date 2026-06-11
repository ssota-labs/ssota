import { NodeResponseSchema } from "@loopos/contracts";
import { getNode } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  return withAuth(request, async () => {
    const data = await getNode(nodeId);
    return jsonOk(NodeResponseSchema.parse({ data }).data);
  });
}
