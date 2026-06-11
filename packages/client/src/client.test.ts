import { describe, expect, it, vi } from "vitest";
import {
  ExecuteActionResponseSchema,
  NodeCatalogListResponseSchema,
} from "@loopos/contracts";
import { createClient } from "./client.js";
import { LooposApiError } from "./error.js";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return vi.fn((input: string | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
}

describe("createClient", () => {
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

    const loopos = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    const types = await loopos.catalog.listNodeTypes();
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

    const loopos = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    const result = await loopos.actions.execute({
      actionType: "nope",
      input: {},
    });
    expect(result.status).toBe("rejected");
  });

  it("throws LooposApiError on 401", async () => {
    const fetch = mockFetch(() =>
      new Response(
        JSON.stringify({ code: "UNAUTHORIZED", message: "Bearer token required" }),
        { status: 401 },
      ),
    );

    const loopos = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "bad" },
      fetch,
    });

    await expect(loopos.catalog.listActionContracts()).rejects.toBeInstanceOf(
      LooposApiError,
    );
  });

  it("throws LooposApiError on 422 validation errors", async () => {
    const fetch = mockFetch(() =>
      new Response(
        JSON.stringify({ code: "VALIDATION_ERROR", message: "Invalid input" }),
        { status: 422 },
      ),
    );

    const loopos = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    await expect(loopos.catalog.listNodeTypes()).rejects.toMatchObject({
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

    const loopos = createClient({
      url: "http://localhost:3001/api/v1",
      auth: { accessToken: "test-token" },
      fetch,
    });

    await expect(loopos.catalog.listActionContracts()).rejects.toThrow();
  });
});
