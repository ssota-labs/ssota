import { GetTaskInputSchema, TaskResponseSchema } from "@ssota/contracts";
import { getTask } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  return withAuth(request, async (ctx) => {
    const input = GetTaskInputSchema.parse({ taskId });
    const data = await getTask(ctx.projectId, input);
    return jsonOk(TaskResponseSchema.parse({ data }).data);
  });
}
