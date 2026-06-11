import {
  EdgeListResponseSchema,
  TraverseEdgesInputSchema,
} from "@loopos/contracts";
import { traverseEdges } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  return withAuth(request, async () => {
    const url = new URL(request.url);
    const parsed = parseQuery(TraverseEdgesInputSchema, url.searchParams);
    if (!parsed.ok) return parsed.response;
    const data = await traverseEdges({ ...parsed.data, nodeId });
    return jsonOk(EdgeListResponseSchema.parse({ data }).data);
  });
}
