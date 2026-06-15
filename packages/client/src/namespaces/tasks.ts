import {
  GetTaskInputSchema,
  QueryTasksInputSchema,
  TaskListResponseSchema,
  TaskResponseSchema,
  type QueryTasksInput,
} from "@ssota/contracts";
import type { HttpClient } from "../http.js";

export function createTasksApi(http: HttpClient) {
  return {
    async list(params?: { limit?: number }) {
      const response = await http.get("/tasks", TaskListResponseSchema, params);
      return response.data;
    },

    async query(input: QueryTasksInput) {
      const parsed = QueryTasksInputSchema.parse(input);
      const response = await http.get("/tasks", TaskListResponseSchema, parsed);
      return response.data;
    },

    async get(taskId: string) {
      const parsed = GetTaskInputSchema.parse({ taskId });
      const response = await http.get(`/tasks/${parsed.taskId}`, TaskResponseSchema);
      return response.data;
    },
  };
}
