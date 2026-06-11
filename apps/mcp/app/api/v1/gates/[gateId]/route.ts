import { GateResponseSchema } from "@ssota/contracts";
import { getGate } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gateId: string }> },
) {
  const { gateId } = await params;
  return withAuth(request, async (ctx) => {
    const data = await getGate(ctx.projectId, gateId);
    return jsonOk(GateResponseSchema.parse({ data }).data);
  });
}
