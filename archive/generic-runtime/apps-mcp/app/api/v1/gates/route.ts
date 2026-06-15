import { GateListResponseSchema, QueryGatesInputSchema } from "@ssota/contracts";
import { queryGates } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const parsed = parseQuery(
      QueryGatesInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await queryGates(ctx.projectId, parsed.data);
    return jsonOk(GateListResponseSchema.parse({ data }).data);
  });
}
