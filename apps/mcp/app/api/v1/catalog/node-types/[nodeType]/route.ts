import { NodeCatalogEntryResponseSchema } from "@loopos/contracts";
import { getNodeType } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeType: string }> },
) {
  const { nodeType } = await params;
  return withAuth(request, async () => {
    const data = await getNodeType(nodeType);
    return jsonOk(NodeCatalogEntryResponseSchema.parse({ data }).data);
  });
}
