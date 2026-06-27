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
        appEnabled: true,
      },
    });

    const teamspaceId = await resolveProjectIdForTool(
      { orgSlug: "ssota-labs", teamspaceSlug: "ssota-dev" },
      extra(),
    );

    expect(teamspaceId).toBe("proj-1");
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
        appEnabled: true,
      },
    });

    const teamspaceId = await resolveProjectIdForTool(
      {},
      extra({ orgSlug: "ssota-labs", teamspaceSlug: "ssota-dev" }),
    );

    expect(teamspaceId).toBe("proj-1");
  });

  it("rejects when membership check fails", async () => {
    vi.spyOn(projectAccess, "resolveProjectAccess").mockResolvedValue(null);

    await expect(
      resolveProjectIdForTool(
        { orgSlug: "ssota-labs", teamspaceSlug: "other" },
        extra(),
      ),
    ).rejects.toThrow("Teamspace not found or access denied");
  });

  it("uses legacy teamspaceId from auth extra when slugs absent", async () => {
    const teamspaceId = await resolveProjectIdForTool(
      {},
      extra({ teamspaceId: "legacy-proj-uuid" }),
    );

    expect(teamspaceId).toBe("legacy-proj-uuid");
  });

  it("requires scope when nothing is provided", async () => {
    await expect(resolveProjectIdForTool({}, extra())).rejects.toThrow(
      "orgSlug and teamspaceSlug are required",
    );
  });
});

describe("stripProjectScope", () => {
  it("removes orgSlug and teamspaceSlug from args", () => {
    expect(
      stripProjectScope({
        orgSlug: "ssota-labs",
        teamspaceSlug: "ssota-dev",
        nodeType: "Document",
      }),
    ).toEqual({ nodeType: "Document" });
  });
});
