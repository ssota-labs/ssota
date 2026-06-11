import { ArchetypeResponseSchema } from "@loopos/contracts";
import { getArchetype } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ archetypeId: string }> },
) {
  const { archetypeId } = await params;
  return withAuth(request, async () => {
    const data = await getArchetype(archetypeId);
    return jsonOk(ArchetypeResponseSchema.parse({ data }).data);
  });
}
