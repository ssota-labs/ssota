import { GateListResponseSchema } from "@ssota/contracts";
import { listPendingGates } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const data = await listPendingGates(ctx.projectId);
    return jsonOk(GateListResponseSchema.parse({ data }).data);
  });
}
