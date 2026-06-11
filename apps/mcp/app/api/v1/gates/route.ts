import { GateListResponseSchema, QueryGatesInputSchema } from "@loopos/contracts";
import { queryGates } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async () => {
    const parsed = parseQuery(
      QueryGatesInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await queryGates(parsed.data);
    return jsonOk(GateListResponseSchema.parse({ data }).data);
  });
}
