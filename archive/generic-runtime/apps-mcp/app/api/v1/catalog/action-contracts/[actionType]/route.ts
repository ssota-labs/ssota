import { ActionContractResponseSchema } from "@ssota/contracts";
import { getActionContract } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ actionType: string }> },
) {
  const { actionType } = await params;
  return withAuth(request, async (ctx) => {
    const data = await getActionContract(ctx.projectId, actionType);
    return jsonOk(ActionContractResponseSchema.parse({ data }).data);
  });
}
