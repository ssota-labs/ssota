import { NodeListResponseSchema, QueryNodesInputSchema } from "@loopos/contracts";
import { queryNodes } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async () => {
    const parsed = parseQuery(
      QueryNodesInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await queryNodes(parsed.data);
    return jsonOk(NodeListResponseSchema.parse({ data }).data);
  });
}
