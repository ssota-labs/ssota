import { ArchetypeListResponseSchema } from "@ssota/contracts";
import { listArchetypes } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const data = await listArchetypes(ctx.projectId);
    return jsonOk(ArchetypeListResponseSchema.parse({ data }).data);
  });
}
