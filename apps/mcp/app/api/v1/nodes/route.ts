import { NodeListResponseSchema, QueryNodesInputSchema } from "@ssota/contracts";
import { queryNodes } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const parsed = parseQuery(
      QueryNodesInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await queryNodes(ctx.projectId, { ...parsed.data, subjectId: ctx.subjectId });
    return jsonOk(NodeListResponseSchema.parse({ data }).data);
  });
}
