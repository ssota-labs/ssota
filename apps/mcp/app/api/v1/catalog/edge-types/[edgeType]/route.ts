import { EdgeCatalogEntryResponseSchema } from "@ssota/contracts";
import { getEdgeType } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ edgeType: string }> },
) {
  const { edgeType } = await params;
  return withAuth(request, async () => {
    const data = await getEdgeType(edgeType);
    return jsonOk(EdgeCatalogEntryResponseSchema.parse({ data }).data);
  });
}
