import { describe, expect, it, vi } from "vitest";
import {
  PROJECT_ID_HEADER,
  TaskListResponseSchema,
} from "@ssota/contracts";
import { createClient } from "./client.js";
import { SsotaApiError } from "./error.js";

const TEST_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return vi.fn((input: string | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
}

describe("createClient", () => {
  it("sends X-SSOTA-Project-Id when projectId is configured", async () => {
    const payload = TaskListResponseSchema.parse({ data: [] });
    let capturedProjectId: string | undefined;

    const fetch = mockFetch((_url, init) => {
      const headers = init?.headers as Record<string, string>;
      capturedProjectId = headers[PROJECT_ID_HEADER];
      return new Response(JSON.stringify(payload), { status: 200 });
    });

    const ssota = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      projectId: TEST_PROJECT_ID,
      fetch,
    });

    await ssota.tasks.list();
    expect(capturedProjectId).toBe(TEST_PROJECT_ID);
  });

  it("lists tasks with response re-parsing", async () => {
    const payload = TaskListResponseSchema.parse({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000010",
          projectId: TEST_PROJECT_ID,
          workflowKey: "development",
          workflowId: null,
          title: "Ship task runtime",
          status: "ready",
          executorType: "Agent",
          assignee: null,
          subjectId: null,
          targetNodeId: null,
          parentTaskId: null,
          sourceActionLogId: null,
          context: {},
          acceptanceCriteria: [],
          idempotencyKey: null,
          result: {},
          completedAt: null,
          createdAt: "2026-06-15T00:00:00.000Z",
          updatedAt: "2026-06-15T00:00:00.000Z",
        },
      ],
    });

    const fetch = mockFetch((url, init) => {
      expect(url).toContain("/api/v1/tasks");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer test-token",
      });
      return new Response(JSON.stringify(payload), { status: 200 });
    });

    const ssota = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    const tasks = await ssota.tasks.list();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe("Ship task runtime");
  });

  it("throws SsotaApiError on 401", async () => {
    const fetch = mockFetch(() =>
      new Response(
        JSON.stringify({ code: "UNAUTHORIZED", message: "Bearer token required" }),
        { status: 401 },
      ),
    );

    const ssota = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "bad" },
      fetch,
    });

    await expect(ssota.tasks.list()).rejects.toBeInstanceOf(SsotaApiError);
  });
});
