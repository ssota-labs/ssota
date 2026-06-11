import {
  GraphTraversalResponseSchema,
  TraverseGraphInputSchema,
} from "@loopos/contracts";
import { traverseGraphService } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async () => {
    const parsed = parseQuery(
      TraverseGraphInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await traverseGraphService(parsed.data);
    return jsonOk(GraphTraversalResponseSchema.parse({ data }).data);
  });
}
