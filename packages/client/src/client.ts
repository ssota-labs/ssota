import { HttpClient, type FetchLike } from "./http.js";
import { createTasksApi } from "./namespaces/tasks.js";

export interface SsotaClientOptions {
  /** SSOTA HTTP API base URL including `/api/v1` (e.g. `http://localhost:3001/api/v1`). */
  url: string;
  auth: {
    accessToken: string | (() => string | Promise<string>);
  };
  /** Project scope sent as `X-SSOTA-Project-Id`; required for task APIs. */
  projectId?: string | (() => string | undefined | Promise<string | undefined>);
  fetch?: FetchLike;
}

export interface SsotaClient {
  tasks: ReturnType<typeof createTasksApi>;
}

export function createClient(options: SsotaClientOptions): SsotaClient {
  const getAccessToken =
    typeof options.auth.accessToken === "function"
      ? options.auth.accessToken
      : () => options.auth.accessToken as string;

  const getProjectId = options.projectId
    ? typeof options.projectId === "function"
      ? options.projectId
      : () => options.projectId as string
    : undefined;

  const http = new HttpClient({
    baseUrl: options.url,
    getAccessToken,
    getProjectId,
    fetch: options.fetch,
  });

  return {
    tasks: createTasksApi(http),
  };
}
