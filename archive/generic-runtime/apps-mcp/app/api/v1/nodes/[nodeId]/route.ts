import { NodeResponseSchema } from "@ssota/contracts";
import { getNode } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  return withAuth(request, async (ctx) => {
    const data = await getNode(ctx.projectId, nodeId);
    return jsonOk(NodeResponseSchema.parse({ data }).data);
  });
}
