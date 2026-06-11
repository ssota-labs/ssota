import { GateResponseSchema } from "@loopos/contracts";
import { getGate } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gateId: string }> },
) {
  const { gateId } = await params;
  return withAuth(request, async () => {
    const data = await getGate(gateId);
    return jsonOk(GateResponseSchema.parse({ data }).data);
  });
}
