import { describe, expect, it, vi } from "vitest";
import {
  ExecuteActionResponseSchema,
  NodeCatalogListResponseSchema,
  PROJECT_ID_HEADER,
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
    const payload = NodeCatalogListResponseSchema.parse({ data: [] });
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

    await ssota.catalog.listNodeTypes();
    expect(capturedProjectId).toBe(TEST_PROJECT_ID);
  });

  it("sends X-SSOTA-Subject-Id when subjectId is configured", async () => {
    const payload = NodeCatalogListResponseSchema.parse({ data: [] });
    let capturedSubjectId: string | undefined;

    const fetch = mockFetch((url, init) => {
      const headers = init?.headers as Record<string, string>;
      capturedSubjectId = headers["X-SSOTA-Subject-Id"];
      return new Response(JSON.stringify(payload), { status: 200 });
    });

    const ssota = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      subjectId: "end-user-42",
      fetch,
    });

    await ssota.catalog.listNodeTypes();
    expect(capturedSubjectId).toBe("end-user-42");
  });

  it("lists node types with response re-parsing", async () => {
    const payload = NodeCatalogListResponseSchema.parse({
      data: [
        {
          nodeType: "Note",
          slug: "note",
          label: "Note",
          family: "document",
          archetypeId: "note",
          typicalValueOverrides: {},
          lifecycleTransitions: {
            Draft: ["Active"],
            Active: ["Archived"],
            Archived: ["Deleted"],
            Deleted: [],
          },
          contentGuide: null,
          propertyRefs: [],
          allowedActionRefs: [],
        },
      ],
    });

    const fetch = mockFetch((url, init) => {
      expect(url).toContain("/api/v1/catalog/node-types");
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

    const types = await ssota.catalog.listNodeTypes();
    expect(types).toHaveLength(1);
    expect(types[0]?.nodeType).toBe("Note");
  });

  it("returns execute_action domain result without throwing on rejected", async () => {
    const payload = ExecuteActionResponseSchema.parse({
      data: {
        status: "rejected",
        reason: "Action 'nope' is not in the action catalog",
        code: "CATALOG_NOT_FOUND",
      },
    });

    const fetch = mockFetch(() =>
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const ssota = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    const result = await ssota.actions.execute({
      actionType: "nope",
      input: {},
    });
    expect(result.status).toBe("rejected");
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

    await expect(ssota.catalog.listActionContracts()).rejects.toBeInstanceOf(
      SsotaApiError,
    );
  });

  it("throws SsotaApiError on 422 validation errors", async () => {
    const fetch = mockFetch(() =>
      new Response(
        JSON.stringify({ code: "VALIDATION_ERROR", message: "Invalid input" }),
        { status: 422 },
      ),
    );

    const ssota = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    await expect(ssota.catalog.listNodeTypes()).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("detects response schema mismatch at runtime", async () => {
    const fetch = mockFetch(() =>
      new Response(
        JSON.stringify({
          data: [{ unexpected: true }],
        }),
        { status: 200 },
      ),
    );

    const ssota = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    await expect(ssota.catalog.listActionContracts()).rejects.toThrow();
  });
});
