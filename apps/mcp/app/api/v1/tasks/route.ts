import {
  GetTaskInputSchema,
  QueryTasksInputSchema,
  SpawnTaskInputSchema,
  TaskListResponseSchema,
  UpdateTaskInputSchema,
} from "@ssota/contracts";
import { listTasks, queryTasks, spawnTask, mapTaskError } from "@/lib/api/services";
import { jsonOk, jsonError, parseJsonBody, parseQuery } from "@/lib/api/response";
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

export async function POST(request: Request) {
  return withAuth(request, async (ctx) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON body", 422);
    }
    const parsed = parseJsonBody(SpawnTaskInputSchema, body);
    if (!parsed.ok) return parsed.response;
    try {
      const data = await spawnTask(ctx.projectId, parsed.data);
      return jsonOk(data, 201);
    } catch (error) {
      const mapped = mapTaskError(error);
      if (mapped) return mapped;
      throw error;
    }
  });
}
