import { ActionCatalogListResponseSchema } from "@ssota/contracts";
import { listActionContracts } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const data = await listActionContracts(ctx.projectId);
    return jsonOk(ActionCatalogListResponseSchema.parse({ data }).data);
  });
}
