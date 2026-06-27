import { HttpClient, type FetchLike } from "./http.js";
import { createTasksApi } from "./namespaces/tasks.js";

export interface SsotaClientOptions {
  /** SSOTA HTTP API base URL including `/api/v1` (e.g. `http://localhost:3001/api/v1`). */
  url: string;
  auth: {
    accessToken: string | (() => string | Promise<string>);
  };
  /** Teamspace scope sent as `X-SSOTA-Teamspace-Id`; required for task APIs. */
  teamspaceId?: string | (() => string | undefined | Promise<string | undefined>);
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

  const getProjectId = options.teamspaceId
    ? typeof options.teamspaceId === "function"
      ? options.teamspaceId
      : () => options.teamspaceId as string
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
