import {
  NeighborQueryResponseSchema,
  QueryNeighborsInputSchema,
} from "@ssota/contracts";
import { queryNeighborsService } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

const NeighborQueryParamsSchema = QueryNeighborsInputSchema.omit({ nodeId: true });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  return withAuth(request, async () => {
    const parsed = parseQuery(
      NeighborQueryParamsSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await queryNeighborsService({ ...parsed.data, nodeId });
    return jsonOk(NeighborQueryResponseSchema.parse({ data }).data);
  });
}
