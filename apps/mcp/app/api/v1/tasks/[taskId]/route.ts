import {
  GetTaskInputSchema,
  TaskResponseSchema,
  UpdateTaskInputSchema,
} from "@ssota/contracts";
import { getTask, updateTask, mapTaskError } from "@/lib/api/services";
import { jsonOk, jsonError, parseJsonBody } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  return withAuth(request, async (ctx) => {
    const input = GetTaskInputSchema.parse({ taskId });
    const data = await getTask(ctx.teamspaceId, input);
    return jsonOk(TaskResponseSchema.parse({ data }).data);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  return withAuth(request, async (ctx) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON body", 422);
    }
    const parsed = parseJsonBody(
      UpdateTaskInputSchema,
      { taskId, ...(body as Record<string, unknown>) },
    );
    if (!parsed.ok) return parsed.response;
    try {
      const data = await updateTask(ctx.teamspaceId, parsed.data);
      return jsonOk(TaskResponseSchema.parse({ data }).data);
    } catch (error) {
      const mapped = mapTaskError(error);
      if (mapped) return mapped;
      throw error;
    }
  });
}
