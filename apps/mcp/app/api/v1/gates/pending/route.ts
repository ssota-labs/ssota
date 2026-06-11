import { GateListResponseSchema } from "@loopos/contracts";
import { listPendingGates } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async () => {
    const data = await listPendingGates();
    return jsonOk(GateListResponseSchema.parse({ data }).data);
  });
}
