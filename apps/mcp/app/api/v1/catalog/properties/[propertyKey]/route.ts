import { PropertyCatalogEntryResponseSchema } from "@ssota/contracts";
import { getProperty } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ propertyKey: string }> },
) {
  const { propertyKey } = await params;
  return withAuth(request, async (ctx) => {
    const data = await getProperty(ctx.projectId, decodeURIComponent(propertyKey));
    return jsonOk(PropertyCatalogEntryResponseSchema.parse({ data }).data);
  });
}
