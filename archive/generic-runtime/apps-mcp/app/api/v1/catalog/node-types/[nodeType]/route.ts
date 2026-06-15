import { NodeCatalogEntryResponseSchema } from "@ssota/contracts";
import { getNodeType } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeType: string }> },
) {
  const { nodeType } = await params;
  return withAuth(request, async (ctx) => {
    const data = await getNodeType(ctx.projectId, nodeType);
    return jsonOk(NodeCatalogEntryResponseSchema.parse({ data }).data);
  });
}
