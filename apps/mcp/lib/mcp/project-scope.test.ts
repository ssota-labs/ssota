import { describe, expect, it, vi } from "vitest";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as projectAccess from "@/lib/mcp/project-access";
import {
  resolveProjectIdForTool,
  stripProjectScope,
} from "@/lib/mcp/project-scope";

describe("resolveProjectIdForTool", () => {
  const extra = (overrides?: Record<string, unknown>): { authInfo: AuthInfo } => ({
    authInfo: {
      token: "t",
      clientId: "user-1",
      scopes: ["openid"],
      extra: {
        user: { id: "user-1" },
        ...overrides,
      },
    },
  });

  it("resolves from tool args with server membership check", async () => {
    vi.spyOn(projectAccess, "resolveProjectAccess").mockResolvedValue({
      org: { id: "org-1", slug: "ssota-labs", name: "SSOTA Labs" },
      project: {
        id: "proj-1",
        organizationId: "org-1",
        slug: "ssota-dev",
        name: "SSOTA Dev",
      },
    });

    const projectId = await resolveProjectIdForTool(
      { orgSlug: "ssota-labs", projectSlug: "ssota-dev" },
      extra(),
    );

    expect(projectId).toBe("proj-1");
    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      "user-1",
      "ssota-labs",
      "ssota-dev",
    );
  });

  it("falls back to auth extra slugs when args omit scope", async () => {
    vi.spyOn(projectAccess, "resolveProjectAccess").mockResolvedValue({
      org: { id: "org-1", slug: "ssota-labs", name: "SSOTA Labs" },
      project: {
        id: "proj-1",
        organizationId: "org-1",
        slug: "ssota-dev",
        name: "SSOTA Dev",
      },
    });

    const projectId = await resolveProjectIdForTool(
      {},
      extra({ orgSlug: "ssota-labs", projectSlug: "ssota-dev" }),
    );

    expect(projectId).toBe("proj-1");
  });

  it("rejects when membership check fails", async () => {
    vi.spyOn(projectAccess, "resolveProjectAccess").mockResolvedValue(null);

    await expect(
      resolveProjectIdForTool(
        { orgSlug: "ssota-labs", projectSlug: "other" },
        extra(),
      ),
    ).rejects.toThrow("Project not found or access denied");
  });

  it("uses legacy projectId from auth extra when slugs absent", async () => {
    const projectId = await resolveProjectIdForTool(
      {},
      extra({ projectId: "legacy-proj-uuid" }),
    );

    expect(projectId).toBe("legacy-proj-uuid");
  });

  it("requires scope when nothing is provided", async () => {
    await expect(resolveProjectIdForTool({}, extra())).rejects.toThrow(
      "orgSlug and projectSlug are required",
    );
  });
});

describe("stripProjectScope", () => {
  it("removes orgSlug and projectSlug from args", () => {
    expect(
      stripProjectScope({
        orgSlug: "ssota-labs",
        projectSlug: "ssota-dev",
        nodeType: "Document",
      }),
    ).toEqual({ nodeType: "Document" });
  });
});
