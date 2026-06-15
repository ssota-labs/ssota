import { WorkflowResponseSchema, GetWorkflowInputSchema } from "@ssota/contracts";
import { getWorkflow } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;
  return withAuth(request, async (ctx) => {
    const lookup = /^[0-9a-f-]{36}$/i.test(workflowId)
      ? { workflowId }
      : { workflowKey: workflowId };
    const data = await getWorkflow(
      ctx.projectId,
      GetWorkflowInputSchema.parse(lookup),
    );
    return jsonOk(WorkflowResponseSchema.parse({ data }).data);
  });
}
