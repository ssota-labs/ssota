import { EdgeCatalogListResponseSchema } from "@ssota/contracts";
import { listEdgeTypes } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async () => {
    const data = await listEdgeTypes();
    return jsonOk(EdgeCatalogListResponseSchema.parse({ data }).data);
  });
}
