import { PropertyCatalogListResponseSchema } from "@ssota/contracts";
import { listProperties } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const data = await listProperties(ctx.projectId);
    return jsonOk(PropertyCatalogListResponseSchema.parse({ data }).data);
  });
}
