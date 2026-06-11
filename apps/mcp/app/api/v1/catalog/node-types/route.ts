import { NodeCatalogListResponseSchema } from "@loopos/contracts";
import { listNodeTypes } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async () => {
    const data = await listNodeTypes();
    return jsonOk(NodeCatalogListResponseSchema.parse({ data }).data);
  });
}
