import { QueryTasksInputSchema, TaskListResponseSchema } from "@ssota/contracts";
import { listTasks, queryTasks } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const url = new URL(request.url);
    const hasQuery = url.searchParams.size > 0;
    if (!hasQuery) {
      const data = await listTasks(ctx.projectId);
      return jsonOk(TaskListResponseSchema.parse({ data }).data);
    }

    const parsed = parseQuery(QueryTasksInputSchema, url.searchParams);
    if (!parsed.ok) return parsed.response;
    const data = await queryTasks(ctx.projectId, parsed.data);
    return jsonOk(TaskListResponseSchema.parse({ data }).data);
  });
}
