import { ActionContractResponseSchema } from "@loopos/contracts";
import { getActionContract } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ actionType: string }> },
) {
  const { actionType } = await params;
  return withAuth(request, async () => {
    const data = await getActionContract(actionType);
    return jsonOk(ActionContractResponseSchema.parse({ data }).data);
  });
}
